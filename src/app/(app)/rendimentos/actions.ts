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

export async function addIncomeAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const amount = Number(formData.get("amount") || 0);
  const type = String(formData.get("type") || "extra");
  const description = String(formData.get("description") || "").trim();
  const entry_date = String(formData.get("entry_date") || new Date().toISOString().slice(0, 10));

  if (amount <= 0) return { error: "O valor tem de ser maior que zero." };

  const { error } = await supabase.from("income_entries").insert({
    user_id: user.id,
    amount,
    type,
    description: description || null,
    entry_date,
    source: "manual",
  });
  if (error) return { error: error.message };
  revalidatePath("/rendimentos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteIncomeAction(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("income_entries").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/rendimentos");
  revalidatePath("/dashboard");
  return { success: true };
}
