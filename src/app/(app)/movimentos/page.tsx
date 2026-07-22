import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import MovementsView from "./movements-view";
import BankBalancesSummary from "@/components/bank-balances-summary";

export default async function MovimentosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: importedIncome }, { data: importedExpenses }, { data: categories }, { data: connections }] =
    await Promise.all([
      supabase
        .from("income_entries")
        .select("id, amount, description, entry_date, bank_connection_id")
        .eq("user_id", userId)
        .eq("source", "bank_import"),
      supabase
        .from("expenses")
        .select("id, amount, description, expense_date, category_id, bank_connection_id")
        .eq("user_id", userId)
        .eq("source", "bank_import"),
      supabase.from("categories").select("id, name, color").eq("user_id", userId).order("name"),
      supabase.from("bank_connections").select("id, bank_name").eq("user_id", userId),
    ]);

  const bankNameById = Object.fromEntries((connections ?? []).map((c) => [c.id, c.bank_name]));

  const allMovements = [
    ...(importedIncome ?? []).map((r) => ({
      id: r.id,
      date: r.entry_date,
      description: r.description,
      amount: Number(r.amount),
      category_id: null as string | null,
      bankName: bankNameById[r.bank_connection_id ?? ""] ?? "Outro",
    })),
    ...(importedExpenses ?? []).map((r) => ({
      id: r.id,
      date: r.expense_date,
      description: r.description,
      amount: -Number(r.amount),
      category_id: r.category_id,
      bankName: bankNameById[r.bank_connection_id ?? ""] ?? "Outro",
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const movementsByBank: Record<string, typeof allMovements> = {};
  for (const m of allMovements) {
    if (!movementsByBank[m.bankName]) movementsByBank[m.bankName] = [];
    movementsByBank[m.bankName].push(m);
  }

  return (
    <>
      <PageHeader
        title="Movimentos"
        subtitle="Extrato bancário automático — entradas e saídas separadas por banco"
      />
      <BankBalancesSummary />
      <MovementsView movementsByBank={movementsByBank} categories={categories ?? []} />
    </>
  );
}
