"use server";

import { createClient } from "@/lib/supabase/server";
import { hashPin, verifyPin } from "@/lib/pin";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function setPinAction(pin: string) {
  if (!/^\d{6}$/.test(pin)) {
    return { error: "O PIN deve ter exatamente 6 dígitos." };
  }
  const { supabase, user } = await requireUser();
  const pin_hash = hashPin(pin);
  const { error } = await supabase
    .from("user_settings")
    .update({ pin_hash, pin_enabled: true })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { success: true };
}

export async function removePinAction() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("user_settings")
    .update({ pin_hash: null, pin_enabled: false })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { success: true };
}

/** Chamado a partir do ecrã de bloqueio (PinGate) para confirmar o PIN introduzido */
export async function verifyPinAction(pin: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("user_settings")
    .select("pin_hash")
    .eq("user_id", user.id)
    .single();
  if (error || !data?.pin_hash) return { error: "PIN não configurado." };
  const ok = verifyPin(pin, data.pin_hash);
  return ok ? { success: true } : { error: "PIN incorreto." };
}

export async function updateProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const full_name = String(formData.get("full_name") || "").trim();
  const country = String(formData.get("country") || "PT");

  const { error } = await supabase
    .from("user_settings")
    .update({ full_name, country })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { success: true };
}

export async function updateAvatarUrlAction(avatar_url: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("user_settings")
    .update({ avatar_url })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { success: true };
}

export async function updatePreferencesAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const bank_connection_pref = String(formData.get("bank_connection_pref") || "skip");
  const wants_investment_tracking = formData.get("wants_investment_tracking") === "on";

  const { error } = await supabase
    .from("user_settings")
    .update({ bank_connection_pref, wants_investment_tracking })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  return { success: true };
}

export async function addCategoryAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#C6A25D");
  const planned_budget = Number(formData.get("planned_budget") || 0);

  if (!name) return { error: "Dá um nome à categoria." };

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, color, planned_budget });
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCategoryAction(categoryId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") || "").trim();
  const color = String(formData.get("color") || "#C6A25D");
  const planned_budget = Number(formData.get("planned_budget") || 0);

  if (!name) return { error: "Dá um nome à categoria." };

  const { error } = await supabase
    .from("categories")
    .update({ name, color, planned_budget })
    .eq("id", categoryId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function saveOpeningBalanceAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const opening_balance = Number(formData.get("opening_balance") || 0);

  const { error } = await supabase
    .from("user_settings")
    .update({ opening_balance })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/definicoes");
  revalidatePath("/dashboard");
  return { success: true };
}
