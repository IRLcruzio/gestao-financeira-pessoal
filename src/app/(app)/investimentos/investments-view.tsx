"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { saveTrading212KeyAction, syncTrading212Action } from "./actions";
import { Card } from "@/components/ui";
import { Money, HideToggleButton, useHiddenValues } from "@/components/hidden-values";

type Position = {
  ticker: string;
  quantity: number;
  currentPrice: number;
  averagePrice: number;
  ppl: number;
  value: number;
  weight: number;
};

type Snapshot = {
  total_value: number;
  snapshot_date: string;
  raw_data?: { positions?: Position[]; totalPpl?: number } | null;
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

export default function InvestmentsView({
  initialSnapshots,
  hasApiKey,
  autoSyncError,
}: {
  initialSnapshots: Snapshot[];
  hasApiKey: boolean;
  autoSyncError?: string | null;
}) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiSecretDraft, setApiSecretDraft] = useState("");
  const [keySaved, setKeySaved] = useState(hasApiKey);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(autoSyncError ?? null);

  const latestSnapshot = snapshots[snapshots.length - 1];
  const positions = latestSnapshot?.raw_data?.positions ?? [];
  const totalPpl = latestSnapshot?.raw_data?.totalPpl ?? 0;

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    setSyncMessage(null);
    const formData = new FormData();
    formData.set("api_key", apiKeyDraft);
    formData.set("api_secret", apiSecretDraft);
    const res = await saveTrading212KeyAction(formData);
    if (res.error) {
      setSyncMessage(res.error);
      return;
    }
    setKeySaved(true);
    setApiKeyDraft("");
    setApiSecretDraft("");
    setSyncMessage("Credenciais guardadas. Já podes sincronizar.");
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    const res = await syncTrading212Action();
    setSyncing(false);
    if (res.error) {
      setSyncMessage(res.error);
      return;
    }
    setSyncMessage("Portfólio sincronizado com sucesso.");
    setSnapshots((prev) => [
      ...prev,
      {
        total_value: res.totalValue ?? 0,
        snapshot_date: new Date().toISOString(),
        raw_data: { positions: res.positions ?? [], totalPpl: res.totalPpl ?? 0 },
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Portfólio Trading212</h2>
          <HideToggleButton />
        </div>
        <p className="mb-4 text-xs text-ink-faint">
          Esta página só lê o que está na tua conta Trading212 — não é possível adicionar
          contribuições manualmente aqui.
        </p>

        {latestSnapshot && (
          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Valor total (última sincronização)</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="figure text-2xl text-ink">
                <Money>{formatEUR(latestSnapshot.total_value)}</Money>
              </p>
              {positions.length > 0 && (
                <span className={`figure text-sm ${totalPpl >= 0 ? "text-positive" : "text-negative"}`}>
                  <Money>
                    {totalPpl >= 0 ? "+" : ""}
                    {formatEUR(totalPpl)}
                  </Money>
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">
              {new Date(latestSnapshot.snapshot_date).toLocaleString("pt-PT")}
            </p>
          </div>
        )}

        {snapshots.length > 1 && <PortfolioLineChart snapshots={snapshots} />}

        {positions.length > 0 && <PositionsTable positions={positions} />}

        {!keySaved ? (
          <form onSubmit={handleSaveKey} className="mt-4 space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Chave da API (API Key)</label>
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder="Cola aqui a chave"
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Segredo (API Secret)</label>
                <input
                  type="password"
                  value={apiSecretDraft}
                  onChange={(e) => setApiSecretDraft(e.target.value)}
                  placeholder="Cola aqui o segredo"
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!apiKeyDraft.trim() || !apiSecretDraft.trim()}
              className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
            >
              Guardar
            </button>
          </form>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-xs text-positive">✓ Atualizado automaticamente sempre que abres esta página</p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-xs text-ink-faint transition hover:text-gold disabled:opacity-50"
            >
              {syncing ? "A atualizar…" : "Forçar atualização"}
            </button>
            <button
              onClick={() => setKeySaved(false)}
              className="text-xs text-ink-faint transition hover:text-ink-muted"
            >
              Trocar credenciais
            </button>
          </div>
        )}
        {syncMessage && (
          <p className={`mt-3 text-xs ${autoSyncError ? "text-negative" : "text-ink-muted"}`}>{syncMessage}</p>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          Gera as credenciais em: Trading212 → Definições → API (Beta) → Generate API Key, com acesso a
          &quot;Account data&quot; e &quot;Portfolio&quot;. A Trading212 mostra a Chave e o Segredo juntos — guarda os dois.
        </p>
      </Card>
    </div>
  );
}

function PositionsTable({ positions }: { positions: Position[] }) {
  const sorted = [...positions].sort((a, b) => b.value - a.value);

  return (
    <div className="mb-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Posições</p>
      <div className="space-y-1">
        {sorted.map((p) => (
          <div key={p.ticker} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-bg-hover">
            <span className="w-24 shrink-0 truncate text-sm text-ink">{p.ticker.replace(/_.*$/, "")}</span>
            <span className="hidden w-16 shrink-0 text-xs text-ink-faint sm:block">{p.quantity} un.</span>
            <span className="hidden w-14 shrink-0 text-xs text-ink-faint sm:block">{formatPercent(p.weight)}</span>
            <span className="figure flex-1 text-right text-sm text-ink">
              <Money>{formatEUR(p.value)}</Money>
            </span>
            <span className={`figure w-24 shrink-0 text-right text-xs ${p.ppl >= 0 ? "text-positive" : "text-negative"}`}>
              <Money>
                {p.ppl >= 0 ? "+" : ""}
                {formatEUR(p.ppl)}
              </Money>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioLineChart({ snapshots }: { snapshots: Snapshot[] }) {
  const { hidden } = useHiddenValues();
  const data = snapshots.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }),
    value: s.total_value,
  }));

  return (
    <div className={`h-40 w-full ${hidden ? "blur-md" : ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" stroke="#6E6A6E" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis hide />
          {!hidden && (
            <Tooltip
              formatter={(value: number) => formatEUR(value)}
              contentStyle={{
                background: "#1A191E",
                border: "1px solid #2C2A31",
                borderRadius: 8,
                fontSize: 12,
                color: "#EDEAE3",
              }}
            />
          )}
          <Line type="monotone" dataKey="value" stroke="#C6A25D" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
