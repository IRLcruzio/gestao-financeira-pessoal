import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import InvestmentsView from "./investments-view";
import { fetchTrading212Portfolio } from "@/lib/trading212";

const SNAPSHOT_THROTTLE_HOURS = 24;

export default async function InvestimentosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: snapshots }, { data: settings }] = await Promise.all([
    supabase
      .from("investment_snapshots")
      .select("total_value, snapshot_date, raw_data")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("user_settings")
      .select("trading212_api_key, trading212_api_secret")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const hasCredentials = Boolean(settings?.trading212_api_key && settings?.trading212_api_secret);
  let liveSnapshots = snapshots ?? [];
  let syncError: string | null = null;

  if (hasCredentials) {
    const result = await fetchTrading212Portfolio(
      settings!.trading212_api_key!,
      settings!.trading212_api_secret!
    );

    if (result.success) {
      const liveEntry = {
        total_value: result.totalValue,
        snapshot_date: new Date().toISOString(),
        raw_data: { positions: result.positions, totalPpl: result.totalPpl },
      };

      // Mostra sempre os dados frescos, mas só grava no histórico 1x a cada 24h
      const lastSaved = snapshots?.[snapshots.length - 1];
      const hoursSinceLast = lastSaved
        ? (Date.now() - new Date(lastSaved.snapshot_date).getTime()) / 1000 / 60 / 60
        : Infinity;

      if (hoursSinceLast >= SNAPSHOT_THROTTLE_HOURS) {
        await supabase.from("investment_snapshots").insert({
          user_id: userId,
          total_value: result.totalValue,
          raw_data: liveEntry.raw_data,
        });
        liveSnapshots = [...(snapshots ?? []), liveEntry];
      } else {
        // Substitui só o último ponto pelo valor fresco, sem duplicar no gráfico
        liveSnapshots = [...(snapshots ?? []).slice(0, -1), liveEntry];
      }
    } else {
      syncError = result.error;
    }
  }

  return (
    <>
      <PageHeader title="Investimentos" subtitle="Portfólio Trading212 — leitura automática" />
      <InvestmentsView
        initialSnapshots={liveSnapshots}
        hasApiKey={hasCredentials}
        autoSyncError={syncError}
      />
    </>
  );
}
