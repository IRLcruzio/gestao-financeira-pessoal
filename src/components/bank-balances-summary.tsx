import { createClient } from "@/lib/supabase/server";
import { getAccountBalances, pickCurrentBalance } from "@/lib/enable-banking";
import { Money } from "@/components/hidden-values";

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default async function BankBalancesSummary() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, bank_name, account_uid")
    .eq("user_id", user?.id ?? "")
    .eq("status", "active");

  if (!connections || connections.length === 0) return null;

  const balances = await Promise.all(
    connections.map(async (conn) => {
      if (!conn.account_uid) return null;
      try {
        const bals = await getAccountBalances(conn.account_uid);
        const current = pickCurrentBalance(bals);
        return current ? { bankName: conn.bank_name, amount: current.amount } : null;
      } catch {
        return null;
      }
    })
  );

  const valid = balances.filter((b): b is { bankName: string; amount: number } => b !== null);
  if (valid.length === 0) return null;

  const total = valid.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-border-subtle bg-bg-surface px-4 py-2.5 text-xs">
      <span className="text-ink-faint uppercase tracking-wide">Contas ligadas:</span>
      {valid.map((b, i) => (
        <span key={i} className="figure text-ink-muted">
          {b.bankName}: <Money>{formatEUR(b.amount)}</Money>
        </span>
      ))}
      {valid.length > 1 && (
        <span className="figure text-gold">
          Total: <Money>{formatEUR(total)}</Money>
        </span>
      )}
    </div>
  );
}
