"use server";

import { createClient } from "@/lib/supabase/server";
import { listASPSPs, startAuthorization } from "@/lib/enable-banking";
import { headers } from "next/headers";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function listBanksAction(country: string) {
  try {
    const aspsps = await listASPSPs(country);
    return { success: true, aspsps };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao listar bancos." };
  }
}

export async function disconnectBankAction(connectionId: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("bank_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}
export async function connectBankAction(aspspName: string, aspspCountry: string, returnTo?: string) {
  const { user } = await requireUser();

  const host = headers().get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const redirectUrl = `${protocol}://${host}/auth/enable-banking/callback`;

  try {
    const result = await startAuthorization({
      aspspName,
      aspspCountry,
      redirectUrl,
      // codificamos user_id + nome do banco + destino de retorno no state
      state: `${user.id}::${encodeURIComponent(aspspName)}::${encodeURIComponent(returnTo || "/definicoes")}`,
    });
    return { success: true, url: result.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao iniciar ligação ao banco." };
  }
}
