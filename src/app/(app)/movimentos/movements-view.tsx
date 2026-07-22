"use client";

import { Card, EmptyState } from "@/components/ui";
import { Money, HideToggleButton } from "@/components/hidden-values";

type Movement = {
  id: string;
  date: string;
  description: string | null;
  amount: number; // positivo = entrada, negativo = saída
  category_id: string | null;
  bankName: string | null;
};

type Category = { id: string; name: string; color: string };

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function MovementsView({
  movementsByBank,
  categories,
}: {
  movementsByBank: Record<string, Movement[]>;
  categories: Category[];
}) {
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const bankNames = Object.keys(movementsByBank);
  const allMovements = Object.values(movementsByBank).flat();

  if (allMovements.length === 0) {
    return (
      <>
        <div className="mb-5 flex justify-end">
          <HideToggleButton />
        </div>
        <EmptyState
          title="Ainda sem movimentos bancários"
          description="Liga um banco em Definições — assim que autorizares, os movimentos aparecem aqui sozinhos, sem precisares de fazer nada."
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <HideToggleButton />
      </div>

      {bankNames.map((bankName) => {
        const movements = movementsByBank[bankName];
        const totalIn = movements.filter((m) => m.amount > 0).reduce((s, m) => s + m.amount, 0);
        const totalOut = movements.filter((m) => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0);

        return (
          <div key={bankName} className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink">{bankName}</h2>
              <div className="flex gap-3 text-xs">
                <span className="figure text-positive">
                  +<Money>{formatEUR(totalIn)}</Money>
                </span>
                <span className="figure text-negative">
                  -<Money>{formatEUR(totalOut)}</Money>
                </span>
              </div>
            </div>
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
          </div>
        );
      })}
    </>
  );
}
