"use server";

import { createClient } from "@/lib/supabase/server";
import { getAccountTransactions, mapTransactionsToRows } from "@/lib/enable-banking";
import { revalidatePath } from "next/cache";

/**
 * Sincroniza TODAS as contas bancárias ligadas do utilizador:
 * - Novas transações entram automaticamente (categoria "Outros" por defeito, para categorizar depois)
 * - Transações que já não aparecem no banco (ex: pendente cancelada) são removidas
 * Chamado automaticamente em segundo plano (a cada minuto) e também manualmente.
 */
export async function autoSyncAllBanksAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", added: 0, removed: 0 };

  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, account_uid, bank_name")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!connections || connections.length === 0) {
    return { success: true, added: 0, removed: 0, noBanks: true };
  }

  const { data: outrasCategoria } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "Outros")
    .maybeSingle();
  const defaultCategoryId = outrasCategoria?.id ?? null;

  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("match_text, category_id")
    .eq("user_id", user.id);

  function guessCategoryId(description: string): string | null {
    const lower = description.trim().toLowerCase();
    const match = (rules ?? []).find((r) => lower.includes(r.match_text));
    return match?.category_id ?? defaultCategoryId;
  }

  let added = 0;
  let removed = 0;
  const errors: string[] = [];
  const allFreshRows: Array<{ date: string; amount: number }> = [];

  for (const conn of connections) {
    if (!conn.account_uid) continue;

    try {
      const transactions = await getAccountTransactions(conn.account_uid);
      const rows = mapTransactionsToRows(transactions, conn.account_uid);
      const freshExternalIds = new Set(rows.map((r) => r.externalId));
      allFreshRows.push(...rows.map((r) => ({ date: r.date, amount: r.amount })));

      // --- Adicionar novas ---
      const [{ data: existingIncome }, { data: existingExpenses }] = await Promise.all([
        supabase
          .from("income_entries")
          .select("id, external_id")
          .eq("user_id", user.id)
          .eq("bank_connection_id", conn.id),
        supabase
          .from("expenses")
          .select("id, external_id")
          .eq("user_id", user.id)
          .eq("bank_connection_id", conn.id),
      ]);

      const existingIds = new Set([
        ...(existingIncome ?? []).map((r) => r.external_id),
        ...(existingExpenses ?? []).map((r) => r.external_id),
      ]);

      const newRows = rows.filter((r) => !existingIds.has(r.externalId));

      const newIncomeRows = newRows
        .filter((r) => r.amount > 0)
        .map((r) => ({
          user_id: user.id,
          amount: r.amount,
          type: "imported",
          description: r.description || null,
          entry_date: r.date,
          source: "bank_import",
          bank_connection_id: conn.id,
          external_id: r.externalId,
        }));

      const newExpenseRows = newRows
        .filter((r) => r.amount < 0)
        .map((r) => ({
          user_id: user.id,
          amount: Math.abs(r.amount),
          category_id: guessCategoryId(r.description),
          description: r.description || null,
          expense_date: r.date,
          source: "bank_import",
          bank_connection_id: conn.id,
          external_id: r.externalId,
        }));

      if (newIncomeRows.length > 0) {
        const { error } = await supabase.from("income_entries").insert(newIncomeRows);
        if (!error) added += newIncomeRows.length;
      }
      if (newExpenseRows.length > 0) {
        const { error } = await supabase.from("expenses").insert(newExpenseRows);
        if (!error) added += newExpenseRows.length;
      }

      // --- Remover o que desapareceu do banco ---
      const incomeToRemove = (existingIncome ?? [])
        .filter((r) => r.external_id && !freshExternalIds.has(r.external_id))
        .map((r) => r.id);
      const expensesToRemove = (existingExpenses ?? [])
        .filter((r) => r.external_id && !freshExternalIds.has(r.external_id))
        .map((r) => r.id);

      if (incomeToRemove.length > 0) {
        await supabase.from("income_entries").delete().in("id", incomeToRemove);
        removed += incomeToRemove.length;
      }
      if (expensesToRemove.length > 0) {
        await supabase.from("expenses").delete().in("id", expensesToRemove);
        removed += expensesToRemove.length;
      }
    } catch (e) {
      errors.push(`${conn.bank_name}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  }

  // --- Reconciliar também movimentos manuais: se não baterem certo com nenhum banco ligado, remover ---
  // (só dentro do período coberto pelo extrato que os bancos devolveram, para não apagar histórico antigo)
  if (allFreshRows.length > 0) {
    const minDate = allFreshRows.reduce((min, r) => (r.date < min ? r.date : min), allFreshRows[0].date);
    const freshKeys = new Set(allFreshRows.map((r) => `${r.date}|${r.amount}`));

    const [{ data: manualIncome }, { data: manualExpenses }] = await Promise.all([
      supabase
        .from("income_entries")
        .select("id, entry_date, amount")
        .eq("user_id", user.id)
        .eq("source", "manual")
        .gte("entry_date", minDate),
      supabase
        .from("expenses")
        .select("id, expense_date, amount")
        .eq("user_id", user.id)
        .eq("source", "manual")
        .gte("expense_date", minDate),
    ]);

    const manualIncomeToRemove = (manualIncome ?? [])
      .filter((r) => !freshKeys.has(`${r.entry_date}|${Number(r.amount)}`))
      .map((r) => r.id);
    const manualExpensesToRemove = (manualExpenses ?? [])
      .filter((r) => !freshKeys.has(`${r.expense_date}|${-Number(r.amount)}`))
      .map((r) => r.id);

    if (manualIncomeToRemove.length > 0) {
      await supabase.from("income_entries").delete().in("id", manualIncomeToRemove);
      removed += manualIncomeToRemove.length;
    }
    if (manualExpensesToRemove.length > 0) {
      await supabase.from("expenses").delete().in("id", manualExpensesToRemove);
      removed += manualExpensesToRemove.length;
    }
  }

  if (added > 0 || removed > 0) {
    revalidatePath("/dashboard");
    revalidatePath("/rendimentos");
    revalidatePath("/despesas");
    revalidatePath("/movimentos");
  }

  return { success: true, added, removed, errors: errors.length > 0 ? errors : undefined };
}
