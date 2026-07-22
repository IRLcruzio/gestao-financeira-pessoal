type Trading212Position = {
  ticker: string;
  quantity: number;
  currentPrice: number;
  averagePrice: number;
  ppl: number;
};

export type EnrichedPosition = {
  ticker: string;
  quantity: number;
  currentPrice: number;
  averagePrice: number;
  ppl: number;
  value: number;
  weight: number;
};

export type Trading212FetchResult =
  | { success: true; totalValue: number; totalPpl: number; positions: EnrichedPosition[]; rawCash: unknown }
  | { success: false; error: string };

/** Vai buscar o estado atual do portfólio Trading212, sem gravar nada na base de dados. */
export async function fetchTrading212Portfolio(
  apiKey: string,
  apiSecret: string
): Promise<Trading212FetchResult> {
  const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const [cashRes, portfolioRes] = await Promise.all([
      fetch("https://live.trading212.com/api/v0/equity/account/cash", {
        headers: { Authorization: authHeader },
        cache: "no-store",
      }),
      fetch("https://live.trading212.com/api/v0/equity/portfolio", {
        headers: { Authorization: authHeader },
        cache: "no-store",
      }),
    ]);

    if (!cashRes.ok || !portfolioRes.ok) {
      const status = !cashRes.ok ? cashRes.status : portfolioRes.status;
      if (status === 401 || status === 403) {
        return {
          success: false,
          error:
            "Chave/segredo inválidos ou sem permissões. Confirma que geraste a chave com acesso a 'Account data' e 'Portfolio'.",
        };
      }
      return { success: false, error: `A Trading212 respondeu com um erro (código ${status}). Tenta novamente mais tarde.` };
    }

    const cash = await cashRes.json();
    const positions: Trading212Position[] = await portfolioRes.json();

    const positionsValue = (positions ?? []).reduce(
      (sum, p) => sum + Number(p.quantity) * Number(p.currentPrice),
      0
    );
    const totalPpl = (positions ?? []).reduce((sum, p) => sum + Number(p.ppl ?? 0), 0);

    // A Trading212 já devolve o total da conta pronto a usar (o mesmo que aparece no ecrã deles).
    // Antes estávamos a somar o valor das posições + cash.invested, o que contava o valor
    // investido a dobrar (cash.invested já reflete esse dinheiro, não é dinheiro "extra").
    const totalValue = Number(cash?.total ?? Number(cash?.free ?? 0) + Number(cash?.invested ?? 0));

    const enrichedPositions: EnrichedPosition[] = (positions ?? []).map((p) => ({
      ticker: p.ticker,
      quantity: Number(p.quantity),
      currentPrice: Number(p.currentPrice),
      averagePrice: Number(p.averagePrice),
      ppl: Number(p.ppl ?? 0),
      value: Number(p.quantity) * Number(p.currentPrice),
      weight: positionsValue > 0 ? (Number(p.quantity) * Number(p.currentPrice)) / positionsValue : 0,
    }));

    return { success: true, totalValue, totalPpl, positions: enrichedPositions, rawCash: cash };
  } catch {
    return { success: false, error: "Não consegui ligar à Trading212. Verifica a tua ligação e tenta novamente." };
  }
}
