import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import SubscriptionList from "./subscription-list";

function advanceRenewalDate(nextRenewal: string, cycle: string): string {
  const date = new Date(nextRenewal);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (date < today) {
    if (cycle === "yearly") date.setFullYear(date.getFullYear() + 1);
    else if (cycle === "weekly") date.setDate(date.getDate() + 7);
    else date.setMonth(date.getMonth() + 1); // monthly (padrão)
  }
  return date.toISOString().slice(0, 10);
}

export default async function SubscricoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: subscriptions }, { data: categories }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, name, amount, billing_cycle, category_id, next_renewal, active")
      .eq("user_id", userId)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", userId)
      .order("name"),
  ]);

  // Avançar sozinho as datas de renovação que já passaram
  const updatedSubscriptions = await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      if (!sub.active || !sub.next_renewal) return sub;
      const today = new Date().toISOString().slice(0, 10);
      if (sub.next_renewal >= today) return sub;

      const newDate = advanceRenewalDate(sub.next_renewal, sub.billing_cycle);
      await supabase.from("subscriptions").update({ next_renewal: newDate }).eq("id", sub.id);
      return { ...sub, next_renewal: newDate };
    })
  );

  return (
    <>
      <PageHeader title="Subscrições" subtitle="Todo o dinheiro comprometido em subscrições ativas" />
      <SubscriptionList initialSubscriptions={updatedSubscriptions} categories={categories ?? []} />
    </>
  );
}
