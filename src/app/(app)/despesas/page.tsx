import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui";
import ExpenseList from "./expense-list";
import BankBalancesSummary from "@/components/bank-balances-summary";
import Link from "next/link";

export default async function DespesasPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: expenses }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount, category_id, description, expense_date, source")
      .eq("user_id", user?.id ?? "")
      .order("expense_date", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", user?.id ?? "")
      .order("name"),
  ]);

  return (
    <>
      <PageHeader title="Despesas" subtitle="Lançamentos organizados por categoria" />
      <BankBalancesSummary />
      {!categories || categories.length === 0 ? (
        <EmptyState
          title="Precisas de categorias primeiro"
          description="Cria pelo menos uma categoria em Definições antes de registares despesas."
          action={
            <Link
              href="/definicoes"
              className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright"
            >
              Ir a Definições
            </Link>
          }
        />
      ) : (
        <ExpenseList initialExpenses={expenses ?? []} categories={categories} />
      )}
    </>
  );
}
