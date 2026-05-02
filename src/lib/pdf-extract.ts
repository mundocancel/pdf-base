import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import {
  BRAND_CONFIGS,
  GENERIC_CONFIG,
  detectBrand,
  type ExtractorConfig,
} from "./brand-configs";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

// ---------- Generic regex rules (legacy quick scan) ----------

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

// ---------- Structured catalog entities ----------

export type CatalogEntity = {
  tipo: "perfil" | "herraje" | "vidrio" | "propiedad_mecanica";
  subtipo?: string;
  datos: Record<string, string | number | null>;
  confianza: number;
  pagina: number;
  texto_original: string;
};

export type PartesListaItem = {
  clave: string;
  piezas_por_atado: string | null;
  largo_std: string | null;
  descripcion: string;
  pagina: number;
};

export type ExtractionResult = {
  fileName: string;
  pages: number;
  text: string;
  fields: ExtractedField[];
  // Structured (multi-brand)
  marca_detectada: string;
  confianza_marca: number;
  entidades: CatalogEntity[];
  partes_lista: PartesListaItem[];
  processedAt: number;
};

// ---------- Helpers ----------

function safeRegex(src: string, flags = "g"): RegExp | null {
  try { return new RegExp(src, flags); } catch { return null; }
}

function dedupeEntities(items: CatalogEntity[]): CatalogEntity[] {
  const map = new Map<string, CatalogEntity>();
  for (const e of items) {
    const key = `${e.tipo}|${e.datos.codigo ?? e.datos.nombre ?? e.texto_original.slice(0, 40)}|${e.pagina}`;
    const prev = map.get(key);
    if (!prev || e.confianza > prev.confianza) map.set(key, e);
  }
  return Array.from(map.values());
}

function context(text: string, idx: number, len: number, span: number): string {
  return text.slice(Math.max(0, idx - span), Math.min(text.length, idx + len + span));
}

// ---------- Per-page extractors ----------

function extractPerfiles(pageText: string, page: number, cfg: ExtractorConfig): CatalogEntity[] {
  const out: CatalogEntity[] = [];
  const c = cfg.perfiles;
  if (!c) return out;
  const codeRe = safeRegex(c.codigo_regex, "g");
  if (!codeRe) return out;
  const exclusions = (c.exclusion_codes || []).map((s) => safeRegex(s, "")).filter(Boolean) as RegExp[];
  const span = c.contexto_chars ?? 200;
  const nombreKW = c.nombre_keywords || [];
  const dimRes = c.dimension_patterns.map((p) => safeRegex(p, "i")).filter(Boolean) as RegExp[];

  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(pageText)) !== null) {
    const code = m[0];
    if (exclusions.some((re) => re.test(code))) continue;
    const ctx = context(pageText, m.index, code.length, span);

    // Nombre: línea/segmento que contenga un keyword
    let nombre: string | null = null;
    const upper = ctx.toUpperCase();
    for (const kw of nombreKW) {
      const ki = upper.indexOf(kw);
      if (ki >= 0) {
        // Capture surrounding uppercase phrase
        const slice = ctx.slice(Math.max(0, ki - 15), ki + 40);
        const match = slice.match(/[A-ZÁÉÍÓÚÑ"\\\-\/\. ]{4,}/);
        nombre = (match ? match[0] : kw).trim();
        break;
      }
    }

    // Dimensiones
    let dim_mm: number | null = null;
    let dim_in: string | null = null;
    for (const re of dimRes) {
      const dm = ctx.match(re);
      if (dm) {
        dim_mm = parseFloat(dm[1]);
        if (dm[2]) dim_in = `${dm[2]}"`;
        break;
      }
    }

    const materialMatch = ctx.match(/6063\s*T[5S]?/i);
    const material = materialMatch ? materialMatch[0].toUpperCase() : null;

    let confianza = 0.4;
    if (nombre && dim_mm) confianza = 0.8;
    else if (nombre || dim_mm) confianza = 0.6;

    out.push({
      tipo: "perfil",
      subtipo: nombre ? nombre.split(" ")[0].toLowerCase() : undefined,
      datos: {
        codigo: code,
        nombre,
        dimensiones_mm: dim_mm,
        dimensiones_pulg: dim_in,
        material,
      },
      confianza,
      pagina: page,
      texto_original: ctx.replace(/\s+/g, " ").trim().slice(0, 240),
    });
  }
  return out;
}

function extractHerrajes(pageText: string, page: number, cfg: ExtractorConfig): CatalogEntity[] {
  const out: CatalogEntity[] = [];
  const c = cfg.herrajes;
  if (!c) return out;
  const codeRe = safeRegex(c.codigo_regex, "g");
  if (!codeRe) return out;
  const capRe = c.capacidad_regex ? safeRegex(c.capacidad_regex, "i") : null;

  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(pageText)) !== null) {
    const code = m[0];
    const ctx = context(pageText, m.index, code.length, 160);
    const upper = ctx.toUpperCase();
    let tipo: string | null = null;
    for (const [t, kws] of Object.entries(c.tipo_keywords)) {
      if (kws.some((kw) => upper.includes(kw.toUpperCase()))) { tipo = t; break; }
    }
    let capacidad: number | null = null;
    if (capRe) {
      const cm = ctx.match(capRe);
      if (cm) capacidad = parseInt(cm[1], 10);
    }
    let confianza = 0.5;
    if (tipo && capacidad) confianza = 0.9;
    else if (tipo) confianza = 0.7;

    out.push({
      tipo: "herraje",
      subtipo: tipo || undefined,
      datos: { codigo: code, tipo, capacidad_kg: capacidad },
      confianza,
      pagina: page,
      texto_original: ctx.replace(/\s+/g, " ").trim().slice(0, 200),
    });
  }
  return out;
}

function extractVidrios(pageText: string, page: number, cfg: ExtractorConfig): CatalogEntity[] {
  const out: CatalogEntity[] = [];
  const c = cfg.vidrios;
  if (!c) return out;
  const re = safeRegex(c.patron, "gi");
  if (!re) return out;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pageText)) !== null) {
    const raw = m[1].toUpperCase().replace(/\s+/g, " ");
    const espesor = m[2] ? parseInt(m[2], 10) : null;
    const tipo = c.tipo_mapeo[raw] || c.tipo_mapeo[raw.replace(/\s+/g, " ")] || raw.toLowerCase();
    out.push({
      tipo: "vidrio",
      subtipo: tipo,
      datos: { tipo, espesor_mm: espesor },
      confianza: 0.95,
      pagina: page,
      texto_original: m[0],
    });
  }
  return out;
}

function extractPropiedades(pageText: string, page: number, cfg: ExtractorConfig): CatalogEntity[] {
  const out: CatalogEntity[] = [];
  const c = cfg.propiedades_mecanicas;
  if (!c) return out;
  for (const pat of c.regex_list) {
    const re = safeRegex(pat, "gi");
    if (!re) continue;
    let m: RegExpExecArray | null;
    while ((m = re.exec(pageText)) !== null) {
      const raw = m[0];
      const numMatch = raw.match(/[\d.]+/);
      out.push({
        tipo: "propiedad_mecanica",
        subtipo: pat.split("\\")[0].slice(0, 24).toLowerCase(),
        datos: { descripcion: raw, valor: numMatch ? parseFloat(numMatch[0]) : null },
        confianza: numMatch ? 0.9 : 0.7,
        pagina: page,
        texto_original: raw,
      });
    }
  }
  return out;
}

function extractPartesLista(pageText: string, page: number, cfg: ExtractorConfig): PartesListaItem[] {
  const out: PartesListaItem[] = [];
  const c = cfg.tabla_partes;
  if (!c) return out;
  // Heuristic: look for lines that start with a numeric/code clave followed by numbers (qty / length)
  const lines = pageText.split(/\n|(?<=\w)\s{3,}/);
  const headerHit = c.header_keywords.some((k) =>
    pageText.toUpperCase().includes(k.toUpperCase())
  );
  if (!headerHit) return out;

  const rowRe = /^\s*([A-Z0-9\-]{3,12})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(.*)$/;
  for (const line of lines) {
    const m = line.match(rowRe);
    if (m) {
      out.push({
        clave: m[1],
        piezas_por_atado: m[2],
        largo_std: m[3],
        descripcion: (m[4] || "").trim(),
        pagina: page,
      });
    }
  }
  return out;
}

// ---------- Main entry ----------

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
  const pageTexts: string[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str).join(" ");
    pageTexts.push(pageText);
    fullText += `\n--- Página ${i} ---\n${pageText}\n`;

    for (const rule of rules) {
      const re = safeRegex(rule.pattern, rule.flags || "g");
      if (!re) continue;
      const matches = pageText.match(re);
      if (matches) for (const mm of matches) fields.push({ type: rule.name, value: mm.trim(), page: i });
    }
    onProgress?.(i / pages);
  }

  // Dedupe quick fields
  const seen = new Set<string>();
  const uniqueFields = fields.filter((f) => {
    const k = `${f.type}|${f.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Brand detection + structured extraction
  const brand = detectBrand(fullText);
  const cfg: ExtractorConfig = BRAND_CONFIGS[brand.name] || GENERIC_CONFIG;

  const entidades: CatalogEntity[] = [];
  const partes: PartesListaItem[] = [];
  pageTexts.forEach((pt, idx) => {
    const p = idx + 1;
    entidades.push(...extractPerfiles(pt, p, cfg));
    entidades.push(...extractHerrajes(pt, p, cfg));
    entidades.push(...extractVidrios(pt, p, cfg));
    entidades.push(...extractPropiedades(pt, p, cfg));
    partes.push(...extractPartesLista(pt, p, cfg));
  });

  return {
    fileName: file.name,
    pages,
    text: fullText,
    fields: uniqueFields,
    marca_detectada: brand.name,
    confianza_marca: brand.confidence,
    entidades: dedupeEntities(entidades),
    partes_lista: partes,
    processedAt: Date.now(),
  };
}

// ---------- Export helpers ----------

export function exportCSV(fields: ExtractedField[]): string {
  const header = "Tipo,Valor,Página\n";
  const rows = fields
    .map((f) => `"${f.type}","${f.value.replace(/"/g, '""')}",${f.page}`)
    .join("\n");
  return header + rows;
}

export function exportEntitiesCSV(items: CatalogEntity[]): string {
  const header = "Tipo,Subtipo,Código,Nombre,Dim_mm,Dim_pulg,Material,Capacidad_kg,Espesor_mm,Confianza,Página\n";
  const rows = items.map((e) => {
    const d = e.datos;
    return [
      e.tipo,
      e.subtipo || "",
      d.codigo ?? "",
      d.nombre ?? "",
      d.dimensiones_mm ?? "",
      d.dimensiones_pulg ?? "",
      d.material ?? "",
      d.capacidad_kg ?? "",
      d.espesor_mm ?? "",
      e.confianza,
      e.pagina,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  return header + rows.join("\n");
}

export function buildStructuredJSON(r: ExtractionResult) {
  return {
    documento: {
      nombre: r.fileName,
      marca_detectada: r.marca_detectada,
      confianza_marca: r.confianza_marca,
      fecha_procesamiento: new Date(r.processedAt).toISOString(),
      paginas: r.pages,
    },
    entidades: r.entidades,
    partes_lista: r.partes_lista,
  };
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
