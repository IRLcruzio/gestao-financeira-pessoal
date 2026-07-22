import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import IncomeList from "./income-list";
import BankBalancesSummary from "@/components/bank-balances-summary";

export default async function RendimentosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("income_entries")
    .select("id, amount, type, description, entry_date, source")
    .eq("user_id", user?.id ?? "")
    .order("entry_date", { ascending: false });

  return (
    <>
      <PageHeader
        title="Rendimentos"
        subtitle="Rendimento fixo, extras, e entradas importadas do banco"
      />
      <BankBalancesSummary />
      <IncomeList initialEntries={entries ?? []} />
    </>
  );
}
