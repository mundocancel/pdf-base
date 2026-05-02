// Multi-brand catalog extraction configuration.
// Patterns are stored as strings so they can be edited / persisted as JSON.

export type BrandPattern = {
  name: string;
  patterns: string[];
  priority: number;
};

export type ExtractorConfig = {
  perfiles?: {
    codigo_regex: string;
    dimension_patterns: string[];
    exclusion_codes?: string[];
    nombre_keywords?: string[];
    contexto_chars?: number;
  };
  herrajes?: {
    codigo_regex: string;
    tipo_keywords: Record<string, string[]>;
    capacidad_regex?: string;
  };
  vidrios?: {
    patron: string;
    tipo_mapeo: Record<string, string>;
  };
  propiedades_mecanicas?: {
    regex_list: string[];
  };
  tabla_partes?: {
    header_keywords: string[];
  };
};

export const BRANDS: BrandPattern[] = [
  {
    name: "Eurovent",
    patterns: ["\\bGN-\\d+", "\\bEUROVENT\\b", "\\b62033\\b", "\\bPREMIUM\\s+SERIE\\s+45\\b"],
    priority: 10,
  },
  {
    name: "Cuprum",
    patterns: ["\\bCUPRUM\\b", "\\b67826\\b", "\\bSOLUCIONES\\s+TIPICAS\\b"],
    priority: 10,
  },
  {
    name: "Smart Frame",
    patterns: ["\\bSmart\\s*Frame\\b", "\\bREFORZADA\\s+RPT\\b", "\\b6063\\s*TS\\s+NORMA\\s+ASTM\\s+B221\\b"],
    priority: 10,
  },
];

const NOMBRE_KEYWORDS_DEFAULT = [
  "CABEZAL", "JAMBA", "RIEL", "TRASLAPE", "ZOCLO", "CONTRAMARCO",
  "MARCO", "HOJA", "JUNQUILLO", "PERFIL", "TRAVESAÑO", "MULLION",
];

export const GENERIC_CONFIG: ExtractorConfig = {
  perfiles: {
    codigo_regex: "\\b\\d{4,5}\\b",
    dimension_patterns: ["(\\d+\\.\\d+)\\s*\\[?(\\d+\\.\\d+)\"?\\]?"],
    exclusion_codes: ["^(19|20)\\d{2}$"],
    nombre_keywords: NOMBRE_KEYWORDS_DEFAULT,
    contexto_chars: 200,
  },
  herrajes: {
    codigo_regex: "\\b[A-Z]{2,}-\\d+[A-Z]*\\b",
    tipo_keywords: {
      bisagra: ["BISAGRA", "HINGE"],
      cremona: ["CREMONA"],
      compas: ["COMPÁS", "COMPAS"],
      carretilla: ["CARRETILLA", "ROLLER"],
      brazo: ["BRAZO"],
      cierre: ["CIERRE", "LOCK"],
    },
    capacidad_regex: "(\\d+)\\s*[Kk][Gg]",
  },
  vidrios: {
    patron: "\\b(VIDRIO|CRISTAL|DOBLE\\s+CRISTAL|DVH)\\b[^\\n]{0,40}?(\\d+)\\s*mm",
    tipo_mapeo: {
      VIDRIO: "monolitico",
      CRISTAL: "monolitico",
      "DOBLE CRISTAL": "doble",
      DVH: "doble",
    },
  },
  propiedades_mecanicas: {
    regex_list: [
      "DEFLEXION\\s*MAX\\.?\\s*L\\/\\d+",
      "I\\s*x-x\\s*=\\s*[\\d.]+\\s*cm4",
      "RESISTENCIA\\s+AL\\s+VIENTO",
      "ESTANQUEIDAD\\s+AL\\s+AGUA",
      "PERMEABILIDAD\\s+AL\\s+AIRE",
    ],
  },
  tabla_partes: {
    header_keywords: ["CLAVE", "PIEZAS", "PZAS", "LARGO", "KEY", "QTY", "LENGTH"],
  },
};

export const BRAND_CONFIGS: Record<string, ExtractorConfig> = {
  Eurovent: {
    ...GENERIC_CONFIG,
    perfiles: {
      ...GENERIC_CONFIG.perfiles!,
      codigo_regex: "\\b\\d{4,5}\\b",
      dimension_patterns: ["(\\d+\\.\\d+)\\s*\\[(\\d+\\.\\d+)\"\\]"],
    },
    herrajes: {
      ...GENERIC_CONFIG.herrajes!,
      codigo_regex: "\\bGN-\\d+[A-Z]*\\b",
    },
  },
  Cuprum: {
    ...GENERIC_CONFIG,
  },
  "Smart Frame": {
    ...GENERIC_CONFIG,
  },
};

export function detectBrand(text: string): { name: string; confidence: number } {
  const sample = text.slice(0, 20000);
  let best = { name: "genérica", score: 0 };
  for (const b of BRANDS) {
    let score = 0;
    for (const p of b.patterns) {
      try {
        const re = new RegExp(p, "gi");
        const matches = sample.match(re);
        if (matches) score += matches.length * b.priority;
      } catch { /* ignore bad regex */ }
    }
    if (score > best.score) best = { name: b.name, score };
  }
  // Normalize confidence into 0..1 (cap)
  const confidence = Math.min(1, best.score / 30);
  return { name: best.score > 0 ? best.name : "genérica", confidence };
}
