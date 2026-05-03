
-- Enums
CREATE TYPE public.material_category AS ENUM ('perfil', 'herraje', 'vidrio');
CREATE TYPE public.perfil_nombre AS ENUM ('Jamba','Zoclo','Cabezal','Riel','Traslape','Junquillo','Interlock','Escalonado','Bolsa');
CREATE TYPE public.herraje_tipo AS ENUM ('Bisagra','Carretilla','Escuadra','Felpa','Vinil','Cremona','Cierre','Brazo','Otro');

-- Series
CREATE TABLE public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Typologies
CREATE TABLE public.typologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serie_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (serie_id, nombre)
);

-- Materials (catálogo unificado)
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria public.material_category NOT NULL,
  codigo_fabricante TEXT NOT NULL,
  -- Perfil
  nombre_estandarizado public.perfil_nombre,
  largo_estandar NUMERIC,
  peso NUMERIC,
  -- Herraje
  descripcion TEXT,
  herraje_tipo public.herraje_tipo,
  -- Vidrio
  vidrio_tipo TEXT,
  espesor_mm NUMERIC,
  serie_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria, codigo_fabricante)
);

-- Fórmulas de corte (perfil x tipología)
CREATE TABLE public.deductions_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipologia_id UUID NOT NULL REFERENCES public.typologies(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  cantidad_piezas INTEGER NOT NULL DEFAULT 1,
  formula_corte_ancho TEXT,
  formula_corte_alto TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_formulas_tipologia ON public.deductions_formulas(tipologia_id);

-- Ensambles (perfil principal -> perfil/herraje relacionado)
CREATE TABLE public.assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_principal_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  material_relacionado_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL DEFAULT 1,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assemblies_principal ON public.assemblies(perfil_principal_id);

-- RLS
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (shared workspace)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['series','typologies','materials','deductions_formulas','assemblies']) LOOP
    EXECUTE format('CREATE POLICY "auth_select_%1$s" ON public.%1$s FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "auth_insert_%1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth_update_%1$s" ON public.%1$s FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "auth_delete_%1$s" ON public.%1$s FOR DELETE TO authenticated USING (true);', t);
  END LOOP;
END $$;
