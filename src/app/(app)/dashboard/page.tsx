import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { Money, HideToggleButton } from "@/components/hidden-values";
import ExpensePieChart from "@/components/expense-pie-chart";
import MonthSelector from "@/components/month-selector";
import BankBalancesSummary from "@/components/bank-balances-summary";
import { getAccountBalances, pickCurrentBalance } from "@/lib/enable-banking";

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

/** Converte qualquer periodicidade para o equivalente mensal */
function monthlyEquivalent(amount: number, cycle: string): number {
  if (cycle === "yearly") return amount / 12;
  if (cycle === "weekly") return amount * 4.345;
  return amount;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12

  if (searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes)) {
    const [y, m] = searchParams.mes.split("-").map(Number);
    year = y;
    month = m;
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endOfMonth = new Date(year, month, 0).toISOString().slice(0, 10);

  const [
    { data: income },
    { data: expenses },
    { data: categories },
    { data: subscriptions },
    { data: settings },
    { data: lifetimeIncome },
    { data: lifetimeExpenses },
    { data: bankConnections },
  ] = await Promise.all([
    supabase.from("income_entries").select("amount").eq("user_id", userId).gte("entry_date", startOfMonth).lte("entry_date", endOfMonth),
    supabase
      .from("expenses")
      .select("amount, category_id")
      .eq("user_id", userId)
      .gte("expense_date", startOfMonth)
      .lte("expense_date", endOfMonth),
    supabase.from("categories").select("id, name, color").eq("user_id", userId),
    // subscrições ativas só entram no mês atual (não faz sentido projetar para o passado)
    isCurrentMonth
      ? supabase.from("subscriptions").select("amount, billing_cycle, category_id").eq("user_id", userId).eq("active", true)
      : Promise.resolve({ data: [] }),
    supabase.from("user_settings").select("opening_balance").eq("user_id", userId).maybeSingle(),
    supabase.from("income_entries").select("amount").eq("user_id", userId),
    supabase.from("expenses").select("amount").eq("user_id", userId),
    supabase.from("bank_connections").select("id, bank_name, account_uid").eq("user_id", userId).eq("status", "active"),
  ]);

  const totalIncome = (income ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalManualExpenses = (expenses ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalSubscriptions = (subscriptions ?? []).reduce(
    (sum, s) => sum + monthlyEquivalent(Number(s.amount), s.billing_cycle),
    0
  );
  const totalExpenses = totalManualExpenses + totalSubscriptions;
  const balance = totalIncome - totalExpenses;
  const hasData =
    (income?.length ?? 0) > 0 ||
    (expenses?.length ?? 0) > 0 ||
    (subscriptions?.length ?? 0) > 0;

  // Saldo total da conta: se houver bancos ligados, confiamos no saldo real deles
  // (mais fiável — o extrato manual/CSV só reflete até ao mês anterior).
  // Sem bancos ligados, calculamos a partir do saldo inicial + tudo o que foi registado.
  const openingBalance = Number(settings?.opening_balance ?? 0);
  let totalAccountBalance = 0;
  let balanceSource: "bank" | "manual" = "manual";
  let bankBalanceError: string | null = null;
  const accountBalances: Array<{ bankName: string; amount: number; currency: string }> = [];

  if (bankConnections && bankConnections.length > 0) {
    try {
      for (const conn of bankConnections) {
        if (!conn.account_uid) continue;
        const balances = await getAccountBalances(conn.account_uid);
        const current = pickCurrentBalance(balances);
        if (current) {
          accountBalances.push({ bankName: conn.bank_name, amount: current.amount, currency: current.currency });
          totalAccountBalance += current.amount;
        }
      }
      if (accountBalances.length > 0) balanceSource = "bank";
    } catch (e) {
      bankBalanceError = e instanceof Error ? e.message : "Erro ao consultar saldo bancário.";
    }
  }

  if (balanceSource === "manual") {
    totalAccountBalance =
      openingBalance +
      (lifetimeIncome ?? []).reduce((sum, r) => sum + Number(r.amount), 0) -
      (lifetimeExpenses ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  }

  const categoryById = Object.fromEntries((categories ?? []).map((c) => [c.id, c]));
  const totalsByCategory = new Map<string, number>();
  for (const exp of expenses ?? []) {
    const key = exp.category_id ?? "sem-categoria";
    totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + Number(exp.amount));
  }
  for (const sub of subscriptions ?? []) {
    const key = sub.category_id ?? "sem-categoria";
    const value = monthlyEquivalent(Number(sub.amount), sub.billing_cycle);
    totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + value);
  }
  const pieData = Array.from(totalsByCategory.entries())
    .map(([categoryId, value]) => ({
      name: categoryById[categoryId]?.name ?? "Sem categoria",
      color: categoryById[categoryId]?.color ?? "#6E6A6E",
      value,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Dashboard" subtitle="Saldo, entradas e saídas" />
        <div className="flex items-center gap-3">
          <MonthSelector year={year} month={month} />
          <HideToggleButton />
        </div>
      </div>

      <BankBalancesSummary />

      <Card className="mb-4">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Saldo total da conta</p>
        <p className={`figure mt-1 text-3xl ${totalAccountBalance >= 0 ? "text-ink" : "text-negative"}`}>
          <Money>{formatEUR(totalAccountBalance)}</Money>
        </p>
        {balanceSource === "bank" ? (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-positive">✓ Saldo real, direto do(s) banco(s) ligado(s)</p>
            {accountBalances.map((acc, i) => (
              <p key={i} className="figure text-xs text-ink-muted">
                {acc.bankName}: <Money>{formatEUR(acc.amount)}</Money>
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-xs text-ink-faint">
            {bankBalanceError
              ? `Não consegui obter o saldo do banco agora (${bankBalanceError}) — a mostrar o cálculo manual.`
              : "Saldo inicial + tudo o que já registaste, em toda a história — liga um banco em Definições para veres o saldo real."}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink-faint">Entradas do mês</p>
          <p className="figure mt-2 text-2xl text-ink"><Money>{formatEUR(totalIncome)}</Money></p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink-faint">Saídas do mês</p>
          <p className="figure mt-2 text-2xl text-ink"><Money>{formatEUR(totalExpenses)}</Money></p>
          {totalSubscriptions > 0 && (
            <p className="mt-1 text-[11px] text-ink-faint">
              inclui <Money>{formatEUR(totalSubscriptions)}</Money> de subscrições
            </p>
          )}
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-ink-faint">Saldo do mês</p>
          <p className={`figure mt-2 text-2xl ${balance >= 0 ? "text-positive" : "text-negative"}`}>
            <Money>{formatEUR(balance)}</Money>
          </p>
        </Card>
      </div>

      <div className="mt-6">
        {pieData.length > 0 ? (
          <Card>
            <h2 className="mb-4 text-sm font-medium text-ink">Onde gastaste mais este mês</h2>
            <ExpensePieChart data={pieData} />
          </Card>
        ) : hasData ? (
          <Card>
            <p className="text-sm text-ink-muted">
              Ainda não há despesas categorizadas neste mês para mostrar no gráfico.
            </p>
          </Card>
        ) : (
          <EmptyState
            title="Ainda não há dados neste mês"
            description="Assim que registares rendimentos e despesas, vais ver aqui o saldo e a distribuição por categoria em gráfico."
          />
        )}
      </div>
    </>
  );
}
