"use client";

import { useState } from "react";
import { addCategoryAction, updateCategoryAction, deleteCategoryAction } from "./actions";
import { Card } from "@/components/ui";

type Category = {
  id: string;
  name: string;
  color: string;
  planned_budget: number;
};

const PALETTE = ["#C6A25D", "#7C9B7E", "#6B8FA3", "#B4614A", "#A67FB5", "#8A9BC4", "#C98B5B", "#8A7241", "#6E6A6E"];

export default function CategoriesSection({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [budget, setBudget] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("color", color);
    formData.set("planned_budget", budget);
    const res = await addCategoryAction(formData);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, color, planned_budget: Number(budget) },
    ]);
    setName("");
    setBudget("0");
    setColor(PALETTE[0]);
    setAdding(false);
  }

  async function handleUpdate(cat: Category, newName: string, newBudget: string) {
    setError(null);
    const formData = new FormData();
    formData.set("name", newName);
    formData.set("color", cat.color);
    formData.set("planned_budget", newBudget);
    const res = await updateCategoryAction(cat.id, formData);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, name: newName, planned_budget: Number(newBudget) } : c))
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await deleteCategoryAction(id);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">Categorias e orçamento planeado</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="rounded border border-border px-3 py-1.5 text-xs text-ink-muted transition hover:border-gold hover:text-gold"
          >
            + Nova categoria
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded border border-border-subtle bg-bg-raised p-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
              className="flex-1 rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
              autoFocus
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Orçamento €"
              className="w-32 rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="h-6 w-6 rounded-full transition"
                style={{ backgroundColor: c, outline: color === c ? "2px solid white" : "none", outlineOffset: 2 }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded bg-gold px-3 py-1.5 text-xs font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
            >
              {saving ? "A guardar…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded px-3 py-1.5 text-xs text-ink-faint transition hover:text-ink-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-3 text-xs text-negative">{error}</p>}

      <div className="space-y-1.5">
        {categories.map((cat) => (
          <CategoryRow
            key={cat.id}
            category={cat}
            editing={editingId === cat.id}
            onEdit={() => setEditingId(cat.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={(n, b) => handleUpdate(cat, n, b)}
            onDelete={() => handleDelete(cat.id)}
          />
        ))}
        {categories.length === 0 && (
          <p className="py-4 text-center text-xs text-ink-faint">Ainda não tens categorias.</p>
        )}
      </div>
    </Card>
  );
}

function CategoryRow({
  category,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  category: Category;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (name: string, budget: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [budget, setBudget] = useState(String(category.planned_budget));

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded px-2 py-1.5">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-border bg-bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-gold"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-24 rounded border border-border bg-bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-gold"
        />
        <button onClick={() => onSave(name, budget)} className="text-xs text-gold hover:underline">
          Guardar
        </button>
        <button onClick={onCancelEdit} className="text-xs text-ink-faint hover:underline">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-bg-hover">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
      <span className="flex-1 text-sm text-ink">{category.name}</span>
      <span className="figure text-xs text-ink-muted">
        {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(category.planned_budget)}
      </span>
      <button
        onClick={onEdit}
        className="text-xs text-ink-faint opacity-0 transition hover:text-gold group-hover:opacity-100"
      >
        Editar
      </button>
      <button
        onClick={onDelete}
        className="text-xs text-ink-faint opacity-0 transition hover:text-negative group-hover:opacity-100"
      >
        Apagar
      </button>
    </div>
  );
}
