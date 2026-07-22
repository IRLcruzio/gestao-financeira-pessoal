"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useHiddenValues } from "@/components/hidden-values";

type Slice = { name: string; value: number; color: string };

function formatEUR(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export default function ExpensePieChart({ data }: { data: Slice[] }) {
  const { hidden } = useHiddenValues();

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className={`h-56 w-56 shrink-0 ${hidden ? "blur-md" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((slice, i) => (
                <Cell key={i} fill={slice.color} />
              ))}
            </Pie>
            {!hidden && (
              <Tooltip
                formatter={(value: number) => formatEUR(value)}
                contentStyle={{
                  background: "#1A191E",
                  border: "1px solid #2C2A31",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#EDEAE3",
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full space-y-2">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="flex-1 text-ink-muted">{slice.name}</span>
            <span className={`figure text-ink ${hidden ? "blur-sm select-none" : ""}`}>
              {hidden ? "•••••" : formatEUR(slice.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
