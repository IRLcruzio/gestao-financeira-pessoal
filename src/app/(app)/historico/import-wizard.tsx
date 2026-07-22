"use client";

import { useState } from "react";
import Papa from "papaparse";
import { importTransactionsAction } from "./import-actions";
import { parsePdfStatementAction } from "./pdf-actions";
import { Card } from "@/components/ui";

type Category = { id: string; name: string; color: string };

type ParsedRow = {
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
  include: boolean;
};

const STEPS = ["Carregar ficheiro", "Mapear colunas", "Rever e categorizar"] as const;

export default function ImportWizard({
  categories,
  onClose,
  onImported,
  initialRows,
}: {
  categories: Category[];
  onClose: () => void;
  onImported: (count: number) => void;
  initialRows?: Array<{ date: string; description: string; amount: number }>;
}) {
  const defaultCategoryId0 = categories.find((c) => c.name === "Outros")?.id ?? categories[0]?.id ?? null;
  const [step, setStep] = useState(initialRows && initialRows.length > 0 ? 2 : 0);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [dateCol, setDateCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [amountCol, setAmountCol] = useState("");
  const [invertSign, setInvertSign] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>(
    (initialRows ?? []).map((r) => ({
      ...r,
      category_id: r.amount < 0 ? defaultCategoryId0 : null,
      include: true,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [processingPdf, setProcessingPdf] = useState(false);

  const defaultCategoryId = defaultCategoryId0;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setProcessingPdf(true);
      const formData = new FormData();
      formData.set("file", file);
      const res = await parsePdfStatementAction(formData);
      setProcessingPdf(false);

      if (res.error) {
        setError(res.error);
        return;
      }

      const rows: ParsedRow[] = (res.rows ?? []).map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        category_id: r.amount < 0 ? defaultCategoryId : null,
        include: true,
      }));
      setParsedRows(rows);
      setStep(2); // salta o passo de mapear colunas — já sabemos os campos
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data.length) {
          setError("Não consegui ler linhas neste ficheiro. Confirma que é um CSV válido.");
          return;
        }
        setCsvHeaders(results.meta.fields ?? []);
        setCsvRows(results.data);
        // tenta adivinhar as colunas certas pelo nome
        const guess = (keywords: string[]) =>
          (results.meta.fields ?? []).find((f) => keywords.some((k) => f.toLowerCase().includes(k))) ?? "";
        setDateCol(guess(["data", "date"]));
        setDescCol(guess(["descri", "desc", "movimento", "detail"]));
        setAmountCol(guess(["valor", "amount", "montante"]));
        setStep(1);
      },
      error: () => setError("Não consegui processar este ficheiro."),
    });
  }

  function parseAmount(raw: string): number {
    // suporta "1.234,56", "1234.56", "-50,00€", etc.
    const cleaned = raw.replace(/[^\d,.-]/g, "");
    const normalized =
      cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
    return Number(normalized) || 0;
  }

  function handleMapConfirm() {
    if (!dateCol || !descCol || !amountCol) {
      setError("Escolhe as três colunas antes de continuares.");
      return;
    }
    setError(null);
    const rows: ParsedRow[] = csvRows.map((r) => {
      let amount = parseAmount(r[amountCol] ?? "0");
      if (invertSign) amount = -amount;
      return {
        date: normalizeDate(r[dateCol] ?? ""),
        description: (r[descCol] ?? "").trim(),
        amount,
        category_id: amount < 0 ? defaultCategoryId : null,
        include: true,
      };
    });
    setParsedRows(rows);
    setStep(2);
  }

  function normalizeDate(raw: string): string {
    // tenta DD/MM/AAAA ou DD-MM-AAAA -> AAAA-MM-DD; senão devolve como veio
    const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) {
      const [, d, m, y] = match;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }

  function updateRow(index: number, patch: Partial<ParsedRow>) {
    setParsedRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    const rowsToImport = parsedRows.filter((r) => r.include);
    const res = await importTransactionsAction(
      rowsToImport.map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        category_id: r.category_id,
      }))
    );
    setImporting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onImported(res.imported ?? 0);
  }

  const includedCount = parsedRows.filter((r) => r.include).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card border border-border-subtle bg-bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-ink">Importar extrato bancário</h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              Passo {step + 1} de {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <button onClick={onClose} className="text-xs text-ink-faint hover:text-ink-muted">
            Fechar
          </button>
        </div>

        {error && <p className="mb-4 rounded border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">{error}</p>}

        {step === 0 && (
          <div className="rounded border border-dashed border-border px-6 py-10 text-center">
            <p className="mb-4 text-sm text-ink-muted">
              Escolhe o ficheiro do teu extrato — CSV (qualquer banco) ou PDF (Extrato Combinado do ActivoBank).
            </p>
            {processingPdf ? (
              <p className="text-sm text-gold">A ler o PDF…</p>
            ) : (
              <label className="inline-block cursor-pointer rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright">
                Escolher ficheiro
                <input type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden" onChange={handleFile} />
              </label>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-ink-muted">
              Diz-me qual coluna do teu ficheiro corresponde a cada campo (já tentei adivinhar):
            </p>
            <ColumnSelect label="Data" value={dateCol} onChange={setDateCol} options={csvHeaders} />
            <ColumnSelect label="Descrição" value={descCol} onChange={setDescCol} options={csvHeaders} />
            <ColumnSelect label="Valor" value={amountCol} onChange={setAmountCol} options={csvHeaders} />
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={invertSign}
                onChange={(e) => setInvertSign(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-bg-surface accent-gold"
              />
              Inverter sinal (marca se as despesas aparecerem como positivas no ficheiro)
            </label>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(0)}
                className="rounded border border-border px-4 py-2 text-sm text-ink-muted transition hover:border-gold hover:text-gold"
              >
                Voltar
              </button>
              <button
                onClick={handleMapConfirm}
                className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright"
              >
                Continuar ({csvRows.length} linhas encontradas)
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-xs text-ink-muted">
              Confirma cada linha, escolhe a categoria das despesas, e desmarca o que não quiseres importar (ex:
              transferências entre as tuas próprias contas).
            </p>
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {parsedRows.map((row, i) => (
                <div key={i} className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${!row.include ? "opacity-40" : ""}`}>
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateRow(i, { include: e.target.checked })}
                    className="h-3.5 w-3.5 shrink-0 rounded border-border bg-bg-surface accent-gold"
                  />
                  <span className="w-20 shrink-0 text-ink-faint">{row.date}</span>
                  <span className="flex-1 truncate text-ink">{row.description || "—"}</span>
                  <span className={`figure w-20 shrink-0 text-right ${row.amount >= 0 ? "text-positive" : "text-negative"}`}>
                    {row.amount >= 0 ? "+" : ""}
                    {row.amount.toFixed(2)}€
                  </span>
                  {row.amount < 0 ? (
                    <select
                      value={row.category_id ?? ""}
                      onChange={(e) => updateRow(i, { category_id: e.target.value })}
                      className="w-28 shrink-0 rounded border border-border bg-bg-surface px-1.5 py-1 text-[11px] text-ink outline-none focus:border-gold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="w-28 shrink-0 text-center text-[10px] uppercase tracking-wide text-gold">Rendimento</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="rounded border border-border px-4 py-2 text-sm text-ink-muted transition hover:border-gold hover:text-gold"
              >
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={importing || includedCount === 0}
                className="rounded bg-gold px-4 py-2 text-sm font-medium text-bg transition hover:bg-gold-bright disabled:opacity-50"
              >
                {importing ? "A importar…" : `Importar ${includedCount} transações`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-ink-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-gold"
      >
        <option value="">Escolher coluna…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
