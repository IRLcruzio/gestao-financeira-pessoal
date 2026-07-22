"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImportWizard from "./import-wizard";
import { Card, EmptyState } from "@/components/ui";
import { Money, HideToggleButton } from "@/components/hidden-values";

type Category = { id: string; name: string; color: string };
type Movement = {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  category_id: string | null;
};

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function HistoricoView({
  categories,
  movements,
}: {
  categories: Category[];
  movements: Movement[];
}) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <>
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-1 text-sm font-medium text-ink">Importar extrato antigo (CSV ou PDF)</h2>
            <p className="text-xs text-ink-muted">
              Para meses que o banco ligado já não mostra automaticamente, ou bancos ainda não ligados.
            </p>
          </div>
          <HideToggleButton />
        </div>
        <button
          onClick={() => setImporting(true)}
          className="mt-4 rounded bg-gold px-4 py-2.5 text-sm font-medium text-bg transition hover:bg-gold-bright"
        >
          Importar extrato
        </button>
      </Card>

      {message && (
        <p className="mb-4 rounded border border-positive/30 bg-positive/10 px-3 py-2 text-xs text-positive">
          {message}
        </p>
      )}

      {importing && (
        <ImportWizard
          categories={categories}
          onClose={() => setImporting(false)}
          onImported={(count) => {
            setImporting(false);
            setMessage(`${count} transações importadas com sucesso.`);
            router.refresh();
          }}
        />
      )}

      {movements.length === 0 ? (
        <EmptyState
          title="Nada registado neste mês"
          description="Navega para outro mês com as setas acima, ou importa um extrato."
        />
      ) : (
        <Card>
          <div className="space-y-1">
            {movements.map((m) => {
              const cat = m.category_id ? categoryById[m.category_id] : null;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded px-2 py-2.5 hover:bg-bg-hover">
                  <span className="w-20 shrink-0 text-xs text-ink-faint">
                    {new Date(m.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                  </span>
                  {cat && (
                    <span
                      className="hidden items-center gap-1.5 rounded bg-bg-raised px-2 py-0.5 text-[10px] uppercase tracking-wide sm:flex"
                      style={{ color: cat.color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm text-ink">{m.description || "—"}</span>
                  <span className={`figure text-sm ${m.amount >= 0 ? "text-positive" : "text-negative"}`}>
                    <Money>
                      {m.amount >= 0 ? "+" : "-"}
                      {formatEUR(Math.abs(m.amount))}
                    </Money>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}
