"use client";

import { useState } from "react";
import { addExpenseAction, deleteExpenseAction, updateExpenseCategoryAction } from "./actions";
import { convertExpenseToSubscriptionAction } from "../subscricoes/actions";
import { Card, EmptyState } from "@/components/ui";
import { Money, HideToggleButton } from "@/components/hidden-values";

type Category = { id: string; name: string; color: string };
type Expense = {
  id: string;
  amount: number;
  category_id: string | null;
  description: string | null;
  expense_date: string;
  source: string;
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function ExpenseList({
  initialExpenses,
  categories,
}: {
  initialExpenses: Expense[];
  categories: Category[];
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const selectableCategories = categories.filter((c) => c.name !== "Subscrições");
  const [categoryId, setCategoryId] = useState(selectableCategories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("category_id", categoryId);
    formData.set("description", description);
    formData.set("expense_date", date);
    const res = await addExpenseAction(formData);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setExpenses((prev) =>
      [
        {
          id: crypto.randomUUID(),
          amount: Number(amount),
          category_id: categoryId || null,
          description: description || null,
          expense_date: date,
          source: "manual",
        },
        ...prev,
      ].sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    );
    setAmount("");
    setDescription("");
    setAdding(false);
  }

  async function handleDelete(id: string) {
    const res = await deleteExpenseAction(id);
    if (res.error) {
      setError(res.error);
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleCategoryChange(id: string, newCategoryId: string) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, category_id: newCategoryId } : e)));
    const res = await updateExpenseCategoryAction(id, newCategoryId);
    if (res.error) setError(res.error);
  }

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertMessage, setConvertMessage] = useState<string | null>(null);

  async function handleConvertToSubscription(id: string, cycle: string) {
    const res = await convertExpenseToSubscriptionAction(id, cycle);
    setConvertingId(null);
    setConvertMessage(res.error ? res.error : "Subscrição criada! Vê em Subscrições.");
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
                <label className="mb-1 block text-xs text-ink-muted">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
                >
                  {categories
                    .filter((c) => c.name !== "Subscrições")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-ink-muted">Descrição (opcional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Supermercado, Renda..."
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

      {convertMessage && (
        <p className="mb-4 rounded border border-positive/30 bg-positive/10 px-3 py-2 text-xs text-positive">
          {convertMessage}
        </p>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          title="Ainda não há despesas registadas"
          description="Adiciona a tua primeira despesa para começares a ver a distribuição por categoria."
        />
      ) : (
        <Card>
          <div className="space-y-1">
            {expenses.map((exp) => {
              const cat = exp.category_id ? categoryById[exp.category_id] : null;
              return (
                <div
                  key={exp.id}
                  className="group flex items-center gap-3 rounded px-2 py-2.5 hover:bg-bg-hover"
                >
                  <span className="w-20 shrink-0 text-xs text-ink-faint">
                    {new Date(exp.expense_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                  </span>
                  <select
                    value={exp.category_id ?? ""}
                    onChange={(e) => handleCategoryChange(exp.id, e.target.value)}
                    className="rounded border-0 bg-bg-raised px-2 py-0.5 text-[10px] uppercase tracking-wide outline-none"
                    style={{ color: cat?.color ?? "#A6A2A0" }}
                  >
                    {selectableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <span className="flex-1 truncate text-sm text-ink">{exp.description || "—"}</span>
                  <span className="figure text-sm text-negative">
                    <Money>-{formatEUR(exp.amount)}</Money>
                  </span>
                  {convertingId === exp.id ? (
                    <div className="flex items-center gap-1">
                      {[
                        { value: "monthly", label: "Mensal" },
                        { value: "yearly", label: "Anual" },
                        { value: "weekly", label: "Semanal" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleConvertToSubscription(exp.id, opt.value)}
                          className="rounded border border-gold/40 px-1.5 py-0.5 text-[10px] text-gold transition hover:bg-gold/10"
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setConvertingId(null)}
                        className="text-[10px] text-ink-faint hover:text-ink-muted"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConvertingId(exp.id)}
                      className="text-xs text-ink-faint opacity-0 transition hover:text-gold group-hover:opacity-100"
                    >
                      Tornar subscrição
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(exp.id)}
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
