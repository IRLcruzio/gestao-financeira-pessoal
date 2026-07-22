/**
 * Analisador do "Extrato Combinado" do ActivoBank em PDF.
 *
 * O texto extraído do PDF (via pdf-parse) organiza cada transação em 3 linhas:
 *   1. As duas datas (lançamento e valor), ex: "6.01  6.01"
 *   2. A descrição
 *   3. O valor e o saldo colados sem espaço, ex: "10.001 307.38"
 *
 * Em vez de tentar separar Débito/Crédito (frágil), usamos o SALDO de cada
 * linha — sempre presente — e calculamos a diferença face ao saldo anterior.
 * Diferença negativa = despesa; positiva = rendimento.
 *
 * Nota: construído a partir de um extrato real do ActivoBank. Se o banco
 * mudar o layout do PDF no futuro, pode ser preciso ajustar.
 */

export type ParsedStatementRow = {
  date: string; // AAAA-MM-DD
  description: string;
  amount: number; // positivo = rendimento, negativo = despesa
};

const DATE_PAIR_LINE = /^(\d{1,2})\.(\d{1,2})\s+(\d{1,2})\.(\d{1,2})$/;
const AMOUNT_BALANCE_LINE = /^(\d+\.\d{2})(\d[\d\s]*\.\d{2})\s*$/;
const YEAR_PATTERN = /(\d{4})\/\d{2}\/\d{2}/;

function cleanNumber(raw: string): number {
  return Number(raw.replace(/\s/g, "")) || 0;
}

export function parseActivoBankStatement(text: string): { rows: ParsedStatementRow[] } | { error: string } {
  const yearMatch = text.match(YEAR_PATTERN);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

  const lines = text.split("\n").map((l) => l.trim());

  function nextNonEmpty(fromIndex: number): number {
    let i = fromIndex;
    while (i < lines.length && lines[i] === "") i++;
    return i;
  }

  const saldoInicialIdx = lines.findIndex((l) => l.toUpperCase() === "SALDO INICIAL");
  if (saldoInicialIdx === -1) {
    return { error: "Não consegui encontrar o 'Saldo Inicial' neste PDF. O formato pode ser diferente do esperado." };
  }

  const balLineIdx = nextNonEmpty(saldoInicialIdx + 1);
  let runningBalance = cleanNumber(lines[balLineIdx]?.replace(/[^\d.,\s]/g, "") ?? "0");

  const rows: ParsedStatementRow[] = [];
  let i = balLineIdx + 1;

  while (i < lines.length) {
    const line = lines[i];
    const dateMatch = line.match(DATE_PAIR_LINE);

    if (dateMatch) {
      const [, , , valorMonth, valorDay] = dateMatch;
      const descIdx = nextNonEmpty(i + 1);
      const description = lines[descIdx] ?? "";
      const numIdx = nextNonEmpty(descIdx + 1);
      const numLine = lines[numIdx] ?? "";
      const numMatch = numLine.match(AMOUNT_BALANCE_LINE);

      if (numMatch) {
        const newBalance = cleanNumber(numMatch[2]);
        const amount = Math.round((newBalance - runningBalance) * 100) / 100;
        runningBalance = newBalance;

        if (amount !== 0) {
          const cleanDescription = description
            .replace(/\bCOMPRA\s+\d+\b/gi, "")
            .replace(/\bCONTACTLESS\b/gi, "")
            .replace(/\s{2,}/g, " ")
            .trim();

          rows.push({
            date: `${year}-${valorMonth.padStart(2, "0")}-${valorDay.padStart(2, "0")}`,
            description: cleanDescription || description.trim(),
            amount,
          });
        }
        i = numIdx + 1;
        continue;
      }
    }
    i++;
  }

  if (rows.length === 0) {
    return { error: "Não encontrei nenhuma transação neste PDF. Confirma que é um Extrato Combinado do ActivoBank." };
  }

  return { rows };
}
