"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MonthSelector({
  year,
  month,
  basePath = "/dashboard",
}: {
  year: number;
  month: number;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = new Date(year, month - 1, 1);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function go(offset: number) {
    const target = new Date(year, month - 1 + offset, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => go(-1)}
        className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition hover:bg-bg-hover hover:text-gold"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={17} strokeWidth={1.75} />
      </button>
      <span className="min-w-28 text-center text-sm capitalize text-ink">
        {current.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
      </span>
      <button
        onClick={() => go(1)}
        disabled={isCurrentMonth}
        className="flex h-8 w-8 items-center justify-center rounded text-ink-muted transition hover:bg-bg-hover hover:text-gold disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Mês seguinte"
      >
        <ChevronRight size={17} strokeWidth={1.75} />
      </button>
      {!isCurrentMonth && (
        <button
          onClick={() => router.push(basePath)}
          className="ml-1 text-xs text-gold transition hover:underline"
        >
          Hoje
        </button>
      )}
    </div>
  );
}
