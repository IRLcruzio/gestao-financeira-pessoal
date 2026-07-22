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

export async function addExpenseAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const amount = Number(formData.get("amount") || 0);
  const category_id = String(formData.get("category_id") || "") || null;
  const description = String(formData.get("description") || "").trim();
  const expense_date = String(formData.get("expense_date") || new Date().toISOString().slice(0, 10));

  if (amount <= 0) return { error: "O valor tem de ser maior que zero." };

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    amount,
    category_id,
    description: description || null,
    expense_date,
    source: "manual",
  });
  if (error) return { error: error.message };
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteExpenseAction(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateExpenseCategoryAction(id: string, categoryId: string) {
  const { supabase, user } = await requireUser();
  const { data: expense } = await supabase
    .from("expenses")
    .select("description, source")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("expenses")
    .update({ category_id: categoryId })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  // Aprender: se veio do banco, guarda uma regra para a próxima vez que aparecer uma despesa parecida
  if (expense?.source === "bank_import" && expense.description) {
    const matchText = expense.description.trim().toLowerCase().slice(0, 60);
    if (matchText) {
      await supabase
        .from("categorization_rules")
        .upsert({ user_id: user.id, match_text: matchText, category_id: categoryId }, { onConflict: "user_id,match_text" });
    }
  }

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  revalidatePath("/movimentos");
  return { success: true };
}
