"use server";

import { parseActivoBankStatement } from "@/lib/parse-activobank-pdf";

export async function parsePdfStatementAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Nenhum ficheiro recebido." };

  try {
    // Import dinâmico: evita que o pdf-parse seja carregado em contextos onde não é preciso
    const pdfParse = (await import("pdf-parse")).default;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdfParse(buffer);

    const result = parseActivoBankStatement(data.text);
    if ("error" in result) return { error: result.error };

    return { success: true, rows: result.rows };
  } catch {
    return { error: "Não consegui ler este PDF. Confirma que não é uma imagem digitalizada (scan)." };
  }
}
