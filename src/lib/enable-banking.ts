import jwt from "jsonwebtoken";
import { createHash } from "crypto";

const BASE_URL = "https://api.enablebanking.com";

function getPrivateKey(): string {
  const key = process.env.ENABLE_BANKING_PRIVATE_KEY;
  if (!key) throw new Error("ENABLE_BANKING_PRIVATE_KEY não está configurada.");

  const trimmed = key.trim();

  // Se já vier no formato PEM normal, só trata de quebras de linha escapadas
  if (trimmed.startsWith("-----BEGIN")) {
    return trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
  }

  // Caso contrário, assume-se que é o ficheiro .pem codificado em base64 numa única linha
  // (mais robusto — evita que quebras de linha se percam ao colar em formulários)
  return Buffer.from(trimmed, "base64").toString("utf-8");
}

function createAuthToken(): string {
  const appId = process.env.ENABLE_BANKING_APP_ID;
  if (!appId) throw new Error("ENABLE_BANKING_APP_ID não está configurada.");

  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: "enablebanking.com", aud: "api.enablebanking.com", iat, exp: iat + 3600 },
    getPrivateKey(),
    { algorithm: "RS256", header: { typ: "JWT", alg: "RS256", kid: appId } }
  );
}

function authHeaders() {
  return {
    Authorization: `Bearer ${createAuthToken()}`,
    "Content-Type": "application/json",
  };
}

export type Aspsp = { name: string; country: string; logo?: string };

export async function listASPSPs(country: string): Promise<Aspsp[]> {
  const res = await fetch(`${BASE_URL}/aspsps?country=${country}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao listar bancos (código ${res.status})`);
  const data = await res.json();
  return data.aspsps ?? [];
}

export async function startAuthorization(params: {
  aspspName: string;
  aspspCountry: string;
  redirectUrl: string;
  state: string;
}): Promise<{ url: string; authorization_id: string }> {
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 dias
  const body = {
    access: { valid_until: validUntil.toISOString() },
    aspsp: { name: params.aspspName, country: params.aspspCountry },
    state: params.state,
    redirect_url: params.redirectUrl,
    psu_type: "personal",
  };
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Erro ao iniciar autorização (código ${res.status}): ${await res.text()}`);
  return res.json();
}

export async function createSession(code: string): Promise<{
  session_id: string;
  accounts: Array<{ uid: string; identification?: unknown }>;
}> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Erro ao criar sessão (código ${res.status}): ${await res.text()}`);
  return res.json();
}

export type AccountBalance = { amount: number; currency: string; type: string };

export async function getAccountBalances(accountUid: string): Promise<AccountBalance[]> {
  const res = await fetch(`${BASE_URL}/accounts/${accountUid}/balances`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao obter saldo (código ${res.status}): ${await res.text()}`);
  const data = await res.json();
  const balances = data.balances ?? [];
  return balances.map((b: { balance_amount: { amount: string; currency: string }; balance_type: string }) => ({
    amount: Number(b.balance_amount.amount),
    currency: b.balance_amount.currency,
    type: b.balance_type,
  }));
}

/** Escolhe o saldo mais representativo do "agora" (disponível/interino antes de fechado) */
export function pickCurrentBalance(balances: AccountBalance[]): AccountBalance | null {
  if (balances.length === 0) return null;
  const preferred =
    balances.find((b) => b.type === "interimAvailable") ||
    balances.find((b) => b.type === "expected") ||
    balances.find((b) => b.type === "closingBooked") ||
    balances[0];
  return preferred;
}
export type EnableBankingTransaction = {
  booking_date?: string;
  value_date?: string;
  transaction_amount: { amount: string; currency: string };
  credit_debit_indicator: "CRDT" | "DBIT";
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
};

export async function getAccountTransactions(
  accountUid: string,
  dateFrom?: string
): Promise<EnableBankingTransaction[]> {
  const url = new URL(`${BASE_URL}/accounts/${accountUid}/transactions`);
  if (dateFrom) url.searchParams.set("date_from", dateFrom);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao obter transações (código ${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.transactions ?? [];
}

/** Converte transações da Enable Banking para o formato comum, com um id estável para reconciliação */
export function mapTransactionsToRows(
  transactions: EnableBankingTransaction[],
  accountUid: string
): Array<{ date: string; description: string; amount: number; externalId: string }> {
  return transactions.map((t) => {
    const amount = Number(t.transaction_amount.amount);
    const signedAmount = t.credit_debit_indicator === "DBIT" ? -amount : amount;
    const description =
      t.remittance_information?.join(" ") || t.creditor?.name || t.debtor?.name || "Movimento bancário";
    const date = t.value_date || t.booking_date || new Date().toISOString().slice(0, 10);
    const externalId = createHash("sha256")
      .update(`${accountUid}|${date}|${description}|${signedAmount}`)
      .digest("hex");
    return { date, description, amount: signedAmount, externalId };
  });
}
