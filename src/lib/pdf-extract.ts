import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

export type ExtractedField = {
  type: string;
  value: string;
  page: number;
};

export type ExtractionRule = {
  name: string;
  pattern: string;
  flags?: string;
};

export const DEFAULT_RULES: ExtractionRule[] = [
  { name: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", flags: "g" },
  { name: "Fecha", pattern: "\\b(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})\\b", flags: "g" },
  { name: "Monto", pattern: "(?:[$€£]\\s?\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?|\\d{1,3}(?:[.,]\\d{3})*[.,]\\d{2}\\s?(?:USD|EUR|MXN|ARS|COP|CLP)?)", flags: "g" },
  { name: "Teléfono", pattern: "\\+?\\d{1,3}[\\s-]?\\(?\\d{2,4}\\)?[\\s-]?\\d{3,4}[\\s-]?\\d{3,4}", flags: "g" },
  { name: "URL", pattern: "https?:\\/\\/[^\\s)]+", flags: "g" },
];

export type ExtractionResult = {
  fileName: string;
  pages: number;
  text: string;
  fields: ExtractedField[];
  processedAt: number;
};

export async function extractPdf(
  file: File,
  rules: ExtractionRule[],
  onProgress?: (p: number) => void
): Promise<ExtractionResult> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = pdf.numPages;
  let fullText = "";
  const fields: ExtractedField[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str).join(" ");
    fullText += `\n--- Página ${i} ---\n${pageText}\n`;

    for (const rule of rules) {
      try {
        const re = new RegExp(rule.pattern, rule.flags || "g");
        const matches = pageText.match(re);
        if (matches) {
          for (const m of matches) {
            fields.push({ type: rule.name, value: m.trim(), page: i });
          }
        }
      } catch {
        /* invalid regex */
      }
    }
    onProgress?.(i / pages);
  }

  // dedupe
  const seen = new Set<string>();
  const unique = fields.filter((f) => {
    const k = `${f.type}|${f.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    fileName: file.name,
    pages,
    text: fullText,
    fields: unique,
    processedAt: Date.now(),
  };
}

export function exportCSV(fields: ExtractedField[]): string {
  const header = "Tipo,Valor,Página\n";
  const rows = fields
    .map((f) => `"${f.type}","${f.value.replace(/"/g, '""')}",${f.page}`)
    .join("\n");
  return header + rows;
}

export function downloadFile(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
