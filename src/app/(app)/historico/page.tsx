import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import HistoricoView from "./historico-view";
import MonthSelector from "@/components/month-selector";

export default async function HistoricoPage({
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
  let month = now.getMonth() + 1;

  if (searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes)) {
    const [y, m] = searchParams.mes.split("-").map(Number);
    year = y;
    month = m;
  }

  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endOfMonth = new Date(year, month, 0).toISOString().slice(0, 10);

  const [{ data: income }, { data: expenses }, { data: categories }] = await Promise.all([
    supabase
      .from("income_entries")
      .select("id, amount, description, entry_date")
      .eq("user_id", userId)
      .gte("entry_date", startOfMonth)
      .lte("entry_date", endOfMonth)
      .order("entry_date", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, amount, description, expense_date, category_id")
      .eq("user_id", userId)
      .gte("expense_date", startOfMonth)
      .lte("expense_date", endOfMonth)
      .order("expense_date", { ascending: false }),
    supabase.from("categories").select("id, name, color").eq("user_id", userId).order("name"),
  ]);

  const movements = [
    ...(income ?? []).map((r) => ({
      id: r.id,
      date: r.entry_date,
      description: r.description,
      amount: Number(r.amount),
      category_id: null as string | null,
    })),
    ...(expenses ?? []).map((r) => ({
      id: r.id,
      date: r.expense_date,
      description: r.description,
      amount: -Number(r.amount),
      category_id: r.category_id,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Histórico" subtitle="Consulta e importa extratos de qualquer mês" />
        <MonthSelector year={year} month={month} basePath="/historico" />
      </div>
      <HistoricoView categories={categories ?? []} movements={movements} />
    </>
  );
}
