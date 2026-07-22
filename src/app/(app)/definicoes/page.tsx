import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import ProfileSection from "./profile-section";
import SecuritySection from "./security-section";
import CategoriesSection from "./categories-section";
import BankConnectionSection from "./bank-connection-section";

export default async function DefinicoesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: settings }, { data: categories }, { data: bankConnections }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("full_name, avatar_url, country, pin_enabled")
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, color, planned_budget")
      .eq("user_id", user?.id ?? "")
      .neq("name", "Subscrições")
      .order("name"),
    supabase
      .from("bank_connections")
      .select("id, bank_name, status, connected_at")
      .eq("user_id", user?.id ?? "")
      .order("connected_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Definições" subtitle="Perfil, segurança e preferências da tua conta" />

      <div className="space-y-4">
        <ProfileSection
          userId={user?.id ?? ""}
          initialFullName={settings?.full_name ?? ""}
          initialCountry={settings?.country ?? "PT"}
          initialAvatarUrl={settings?.avatar_url ?? null}
        />
        <Suspense fallback={null}>
          <BankConnectionSection
            initialConnections={bankConnections ?? []}
            country={settings?.country ?? "PT"}
          />
        </Suspense>
        <CategoriesSection initialCategories={categories ?? []} />
        <SecuritySection pinEnabled={settings?.pin_enabled ?? false} />
      </div>
    </>
  );
}
