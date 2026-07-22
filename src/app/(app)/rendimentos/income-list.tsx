"use client";

import { useState } from "react";
import { addIncomeAction, deleteIncomeAction } from "./actions";
import { Card, EmptyState } from "@/components/ui";
import { Money, HideToggleButton } from "@/components/hidden-values";

type IncomeEntry = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  entry_date: string;
  source: string;
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

const TYPE_LABELS: Record<string, string> = {
  fixed: "Fixo",
  extra: "Extra",
  imported: "Importado",
};

export default function IncomeList({ initialEntries }: { initialEntries: IncomeEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("extra");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("type", type);
    formData.set("description", description);
    formData.set("entry_date", date);
    const res = await addIncomeAction(formData);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEntries((prev) =>
      [
        {
          id: crypto.randomUUID(),
          amount: Number(amount),
          type,
          description: description || null,
          entry_date: date,
          source: "manual",
        },
        ...prev,
      ].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    );
    setAmount("");
    setDescription("");
    setAdding(false);
  }

  async function handleDelete(id: string) {
    const res = await deleteIncomeAction(id);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <Card className="flex-1">
          <p className="text-xs uppercase tracking-wide text-ink-faint">Total registado</p>
          <p className="figure mt-1 text-xl text-ink">
            <Money>{formatEUR(total)}</Money>
          </p>
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
                <label className="mb-1 block text-xs text-ink-muted">Valor (€)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                >
                  <option value="fixed">Fixo (salário)</option>
                  <option value="extra">Extra</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Descrição (opcional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Salário, Freelance..."
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                />
              </div>
            </div>
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

      {entries.length === 0 ? (
        <EmptyState
          title="Ainda não há rendimentos registados"
          description="Adiciona o teu salário ou um extra para começares a ver o teu saldo mensal."
        />
      ) : (
        <Card>
          <div className="space-y-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded px-2 py-2.5 hover:bg-bg-hover"
              >
                <span className="w-20 shrink-0 text-xs text-ink-faint">
                  {new Date(entry.entry_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                </span>
                <span className="rounded bg-bg-raised px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                  {TYPE_LABELS[entry.type] ?? entry.type}
                </span>
                <span className="flex-1 truncate text-sm text-ink">{entry.description || "—"}</span>
                <span className="figure text-sm text-positive">
                  <Money>+{formatEUR(entry.amount)}</Money>
                </span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs text-ink-faint opacity-0 transition hover:text-negative group-hover:opacity-100"
                >
                  Apagar
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
