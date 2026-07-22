"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchTrading212Portfolio } from "@/lib/trading212";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function saveTrading212KeyAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const apiKey = String(formData.get("api_key") || "").trim();
  const apiSecret = String(formData.get("api_secret") || "").trim();

  const { error } = await supabase
    .from("user_settings")
    .update({
      trading212_api_key: apiKey || null,
      trading212_api_secret: apiSecret || null,
    })
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/investimentos");
  return { success: true };
}

/**
 * Liga-se à API da Trading212 e guarda uma nova fotografia (snapshot) do portfólio,
 * incluindo cada posição individual (ticker, quantidade, valor, variação).
 * Usado pelo botão "Sincronizar agora" — grava sempre um novo ponto no histórico.
 */
export async function syncTrading212Action() {
  const { supabase, user } = await requireUser();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("trading212_api_key, trading212_api_secret")
    .eq("user_id", user.id)
    .maybeSingle();

  const apiKey = settings?.trading212_api_key;
  const apiSecret = settings?.trading212_api_secret;
  if (!apiKey || !apiSecret) {
    return { error: "Ainda não guardaste a chave e o segredo da API Trading212." };
  }

  const result = await fetchTrading212Portfolio(apiKey, apiSecret);
  if (!result.success) return { error: result.error };

  const { error } = await supabase.from("investment_snapshots").insert({
    user_id: user.id,
    total_value: result.totalValue,
    raw_data: { cash: result.rawCash, positions: result.positions, totalPpl: result.totalPpl },
  });
  if (error) return { error: error.message };

  revalidatePath("/investimentos");
  return { success: true, totalValue: result.totalValue, totalPpl: result.totalPpl, positions: result.positions };
}
