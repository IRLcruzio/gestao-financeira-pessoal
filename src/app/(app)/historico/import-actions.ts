"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ImportRow = {
  date: string;
  description: string;
  amount: number; // positivo = rendimento, negativo = despesa
  category_id: string | null; // só relevante para despesas
};

export async function importTransactionsAction(rows: ImportRow[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const incomeRows = rows
    .filter((r) => r.amount > 0)
    .map((r) => ({
      user_id: user.id,
      amount: r.amount,
      type: "imported",
      description: r.description || null,
      entry_date: r.date,
      source: "bank_import",
    }));

  const expenseRows = rows
    .filter((r) => r.amount < 0)
    .map((r) => ({
      user_id: user.id,
      amount: Math.abs(r.amount),
      category_id: r.category_id,
      description: r.description || null,
      expense_date: r.date,
      source: "bank_import",
    }));

  if (incomeRows.length > 0) {
    const { error } = await supabase.from("income_entries").insert(incomeRows);
    if (error) return { error: error.message };
  }
  if (expenseRows.length > 0) {
    const { error } = await supabase.from("expenses").insert(expenseRows);
    if (error) return { error: error.message };
  }

  revalidatePath("/despesas");
  revalidatePath("/rendimentos");
  revalidatePath("/dashboard");
  return { success: true, imported: incomeRows.length + expenseRows.length };
}
