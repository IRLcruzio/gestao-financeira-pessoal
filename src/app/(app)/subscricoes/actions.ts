"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function addSubscriptionAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const billing_cycle = String(formData.get("billing_cycle") || "monthly");
  const next_renewal = String(formData.get("next_renewal") || "") || null;

  if (!name) return { error: "Dá um nome à subscrição." };
  if (amount <= 0) return { error: "O valor tem de ser maior que zero." };

  // A categoria "Subscrições" é sempre atribuída automaticamente
  const { data: subCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Subscrições")
    .maybeSingle();

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    name,
    amount,
    billing_cycle,
    category_id: subCategory?.id ?? null,
    next_renewal,
    active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/subscricoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleSubscriptionActiveAction(id: string, active: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("subscriptions")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/subscricoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSubscriptionAction(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/subscricoes");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Pega numa despesa já registada e transforma-a numa subscrição recorrente daqui para a frente */
export async function convertExpenseToSubscriptionAction(expenseId: string, billingCycle: string) {
  const { supabase, user } = await requireUser();

  const { data: expense } = await supabase
    .from("expenses")
    .select("description, amount, expense_date")
    .eq("id", expenseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!expense) return { error: "Não encontrei essa despesa." };

  const { data: subCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Subscrições")
    .maybeSingle();

  const nextRenewal = new Date(expense.expense_date);
  if (billingCycle === "yearly") nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
  else if (billingCycle === "weekly") nextRenewal.setDate(nextRenewal.getDate() + 7);
  else nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    name: expense.description || "Subscrição",
    amount: expense.amount,
    billing_cycle: billingCycle,
    category_id: subCategory?.id ?? null,
    next_renewal: nextRenewal.toISOString().slice(0, 10),
    active: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/subscricoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}
