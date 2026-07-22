"use client";

import { useState } from "react";
import { addSubscriptionAction, toggleSubscriptionActiveAction, deleteSubscriptionAction } from "./actions";
import { Card, EmptyState } from "@/components/ui";
import { Money, HideToggleButton } from "@/components/hidden-values";

type Category = { id: string; name: string; color: string };
type Subscription = {
  id: string;
  name: string;
  amount: number;
  billing_cycle: string;
  category_id: string | null;
  next_renewal: string | null;
  active: boolean;
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "/ mês",
  yearly: "/ ano",
  weekly: "/ semana",
};

/** Converte qualquer periodicidade para o equivalente mensal, para somar tudo de forma justa */
function monthlyEquivalent(amount: number, cycle: string): number {
  if (cycle === "yearly") return amount / 12;
  if (cycle === "weekly") return amount * 4.345;
  return amount;
}

export default function SubscriptionList({
  initialSubscriptions,
  categories,
}: {
  initialSubscriptions: Subscription[];
  categories: Category[];
}) {
  const [subs, setSubs] = useState(initialSubscriptions);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [nextRenewal, setNextRenewal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSubs = subs.filter((s) => s.active);
  const totalMonthly = activeSubs.reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.billing_cycle), 0);
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const subscricoesCategory = categories.find((c) => c.name === "Subscrições");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("amount", amount);
    formData.set("billing_cycle", cycle);
    formData.set("next_renewal", nextRenewal);
    const res = await addSubscriptionAction(formData);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSubs((prev) => [
      {
        id: crypto.randomUUID(),
        name,
        amount: Number(amount),
        billing_cycle: cycle,
        category_id: subscricoesCategory?.id ?? null,
        next_renewal: nextRenewal || null,
        active: true,
      },
      ...prev,
    ]);
    setName("");
    setAmount("");
    setNextRenewal("");
    setAdding(false);
  }

  async function handleToggle(sub: Subscription) {
    const res = await toggleSubscriptionActiveAction(sub.id, !sub.active);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSubs((prev) => prev.map((s) => (s.id === sub.id ? { ...s, active: !s.active } : s)));
  }

  async function handleDelete(id: string) {
    const res = await deleteSubscriptionAction(id);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <Card className="flex-1">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Comprometido por mês</p>
          <p className="figure mt-1 text-xl text-ink">
            <Money>{formatEUR(totalMonthly)}</Money>
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">{activeSubs.length} subscrições ativas</p>
        </Card>
        <div className="ml-3 flex items-center gap-2">
          <HideToggleButton />
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="rounded bg-gold px-4 py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright"
            >
              + Adicionar
            </button>
          )}
        </div>
      </div>

      {adding && (
        <Card className="mb-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Netflix, Spotify..."
                  required
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Valor (€)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Periodicidade</label>
                <select
                  value={cycle}
                  onChange={(e) => setCycle(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="weekly">Semanal</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Próxima renovação</label>
                <input
                  type="date"
                  value={nextRenewal}
                  onChange={(e) => setNextRenewal(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </div>
            </div>
            <p className="text-xs text-ink-faint">
              Fica automaticamente na categoria <span className="text-gold">Subscrições</span>.
            </p>
            {error && <p className="text-xs text-negative">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
              >
                {saving ? "A guardar…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded px-4 py-2 text-sm text-ink-faint transition hover:text-ink-muted"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      )}

      {subs.length === 0 ? (
        <EmptyState
          title="Ainda não há subscrições registadas"
          description="Adiciona o Netflix, Spotify, ginásio, ou qualquer pagamento recorrente."
        />
      ) : (
        <Card>
          <div className="space-y-1">
            {subs.map((sub) => {
              const cat = sub.category_id ? categoryById[sub.category_id] : null;
              const renewalSoon =
                sub.next_renewal &&
                new Date(sub.next_renewal).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7;
              return (
                <div
                  key={sub.id}
                  className={`group flex items-center gap-3 rounded px-2 py-2.5 hover:bg-bg-hover ${
                    !sub.active ? "opacity-40" : ""
                  }`}
                >
                  <span className="flex-1 truncate text-sm text-ink">{sub.name}</span>
                  {cat && (
                    <span
                      className="hidden items-center gap-1.5 rounded bg-bg-raised px-2 py-0.5 text-[10px] uppercase tracking-wide sm:flex"
                      style={{ color: cat.color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                  )}
                  {sub.next_renewal && (
                    <span className={`hidden text-xs sm:inline ${renewalSoon ? "text-gold" : "text-ink-faint"}`}>
                      renova {new Date(sub.next_renewal).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                  <span className="figure text-sm text-ink">
                    <Money>{formatEUR(sub.amount)}</Money>
                    <span className="text-ink-faint"> {CYCLE_LABELS[sub.billing_cycle]}</span>
                  </span>
                  <button
                    onClick={() => handleToggle(sub)}
                    className="text-xs text-ink-faint opacity-0 transition hover:text-gold group-hover:opacity-100"
                  >
                    {sub.active ? "Pausar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="text-xs text-ink-faint opacity-0 transition hover:text-negative group-hover:opacity-100"
                  >
                    Apagar
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
