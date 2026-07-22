"use server";

import { createClient } from "@/lib/supabase/server";

export async function completeOnboardingAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faz login novamente." };

  const bank_connection_pref = String(formData.get("bank_connection_pref") || "skip");
  const wants_investment_tracking = formData.get("wants_investment_tracking") === "on";

  const { error } = await supabase
    .from("user_settings")
    .update({
      bank_connection_pref,
      wants_investment_tracking,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
