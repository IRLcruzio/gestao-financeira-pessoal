import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "./wizard";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_settings")
    .select("country")
    .eq("user_id", user.id)
    .maybeSingle();

  return <OnboardingWizard userId={user.id} country={settings?.country ?? "PT"} />;
}
