import Nav from "@/components/nav";
import PinGate from "@/components/pin-gate";
import BankAutoSync from "@/components/bank-auto-sync";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("pin_enabled, full_name, avatar_url")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <PinGate pinEnabled={settings?.pin_enabled ?? false}>
      <BankAutoSync />
      <div className="flex min-h-dvh flex-col md:flex-row">
        <Nav
          userEmail={user?.email ?? ""}
          fullName={settings?.full_name ?? null}
          avatarUrl={settings?.avatar_url ?? null}
        />
        <main className="flex-1 pt-14 md:pt-0 md:pl-60">
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-10">{children}</div>
        </main>
      </div>
    </PinGate>
  );
}
