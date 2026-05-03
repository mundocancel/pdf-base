import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { evalFormula } from "@/lib/formula";
import { Calculator } from "lucide-react";

export const Route = createFileRoute("/cotizador")({
  head: () => ({ meta: [{ title: "Cotizador / Despiece — Cancelería" }] }),
  component: CotizadorPage,
});

type Serie = { id: string; nombre: string };
type Tipologia = { id: string; serie_id: string; nombre: string };
type Perfil = { id: string; codigo_fabricante: string; nombre_estandarizado: string | null };
type Material = { id: string; codigo_fabricante: string; descripcion: string | null; herraje_tipo: string | null };
type Formula = { id: string; perfil_id: string; cantidad_piezas: number; formula_corte_ancho: string | null; formula_corte_alto: string | null };
type Assembly = { perfil_principal_id: string; material_relacionado_id: string; cantidad: number };

function CotizadorPage() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [tipologias, setTipologias] = useState<Tipologia[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [herrajes, setHerrajes] = useState<Material[]>([]);
  const [serieId, setSerieId] = useState<string>("");
  const [tipoId, setTipoId] = useState<string>("");
  const [L, setL] = useState<number>(1200);
  const [H, setH] = useState<number>(1000);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);

  useEffect(() => {
    (async () => {
      const [s, t, p, h] = await Promise.all([
        supabase.from("series").select("id, nombre").order("nombre"),
        supabase.from("typologies").select("id, serie_id, nombre").order("nombre"),
        supabase.from("materials").select("id, codigo_fabricante, nombre_estandarizado").eq("categoria", "perfil"),
        supabase.from("materials").select("id, codigo_fabricante, descripcion, herraje_tipo").eq("categoria", "herraje"),
      ]);
      setSeries((s.data as Serie[]) ?? []);
      setTipologias((t.data as Tipologia[]) ?? []);
      setPerfiles((p.data as Perfil[]) ?? []);
      setHerrajes((h.data as Material[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!tipoId) { setFormulas([]); return; }
    (async () => {
      const { data } = await supabase.from("deductions_formulas").select("id, perfil_id, cantidad_piezas, formula_corte_ancho, formula_corte_alto").eq("tipologia_id", tipoId);
      setFormulas((data as Formula[]) ?? []);
      const perfilIds = (data ?? []).map((d: any) => d.perfil_id);
      if (perfilIds.length) {
        const { data: a } = await supabase.from("assemblies").select("perfil_principal_id, material_relacionado_id, cantidad").in("perfil_principal_id", perfilIds);
        setAssemblies((a as Assembly[]) ?? []);
      } else setAssemblies([]);
    })();
  }, [tipoId]);

  const tipsOfSerie = useMemo(() => tipologias.filter(t => !serieId || t.serie_id === serieId), [tipologias, serieId]);

  const cortes = useMemo(() => {
    return formulas.map(f => {
      const perfil = perfiles.find(p => p.id === f.perfil_id);
      const ancho = evalFormula(f.formula_corte_ancho, { L, H });
      const alto = evalFormula(f.formula_corte_alto, { L, H });
      // Use whichever dimension was defined; if both, treat ancho as horizontal piece
      const corte = ancho ?? alto;
      return { id: f.id, perfil, cantidad: f.cantidad_piezas, ancho, alto, corte };
    });
  }, [formulas, perfiles, L, H]);

  const herrajesAgg = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of formulas) {
      const rels = assemblies.filter(a => a.perfil_principal_id === f.perfil_id);
      for (const r of rels) {
        if (!herrajes.find(h => h.id === r.material_relacionado_id)) continue;
        map.set(r.material_relacionado_id, (map.get(r.material_relacionado_id) ?? 0) + r.cantidad * f.cantidad_piezas);
      }
    }
    return Array.from(map.entries()).map(([id, cant]) => ({ herraje: herrajes.find(h => h.id === id)!, cantidad: cant }));
  }, [assemblies, herrajes, formulas]);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Calculator className="h-6 w-6"/>Cotizador / Despiece</h1>

      <Card className="p-4 mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Serie</Label>
            <Select value={serieId} onValueChange={(v)=>{setSerieId(v); setTipoId("");}}>
              <SelectTrigger><SelectValue placeholder="Serie"/></SelectTrigger>
              <SelectContent>{series.map(s=><SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipología</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger><SelectValue placeholder="Tipología"/></SelectTrigger>
              <SelectContent>{tipsOfSerie.map(t=><SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>L · Ancho (mm)</Label><Input type="number" value={L} onChange={(e)=>setL(Number(e.target.value))}/></div>
          <div><Label>H · Alto (mm)</Label><Input type="number" value={H} onChange={(e)=>setH(Number(e.target.value))}/></div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Cortes de aluminio</h2>
          {cortes.length === 0 ? <p className="text-sm text-muted-foreground">Selecciona una tipología con fórmulas.</p> :
          <Table>
            <TableHeader><TableRow><TableHead>Perfil</TableHead><TableHead>Pzas</TableHead><TableHead>Corte (mm)</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader>
            <TableBody>
              {cortes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.perfil?.codigo_fabricante} — {c.perfil?.nombre_estandarizado}</TableCell>
                  <TableCell>{c.cantidad}</TableCell>
                  <TableCell className="font-mono">{c.corte != null ? c.corte.toFixed(1) : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.ancho != null && <>A: {c.ancho.toFixed(1)} </>}
                    {c.alto != null && <>H: {c.alto.toFixed(1)}</>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-2">Herrajes</h2>
          {herrajesAgg.length === 0 ? <p className="text-sm text-muted-foreground">No hay herrajes ensamblados a estos perfiles.</p> :
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead>Cant.</TableHead></TableRow></TableHeader>
            <TableBody>
              {herrajesAgg.map(h => (
                <TableRow key={h.herraje.id}>
                  <TableCell className="font-mono text-sm">{h.herraje.codigo_fabricante}</TableCell>
                  <TableCell>{h.herraje.herraje_tipo}</TableCell>
                  <TableCell>{h.herraje.descripcion}</TableCell>
                  <TableCell>{h.cantidad}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>}
        </Card>
      </div>
    </AppLayout>
  );
}
