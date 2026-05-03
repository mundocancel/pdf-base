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
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/tipologias")({
  head: () => ({ meta: [{ title: "Tipologías — Cancelería" }] }),
  component: TipologiasPage,
});

type Serie = { id: string; nombre: string };
type Tipologia = { id: string; serie_id: string; nombre: string; descripcion: string | null };
type Perfil = { id: string; codigo_fabricante: string; nombre_estandarizado: string | null; serie_id: string | null };
type Formula = {
  id: string;
  tipologia_id: string;
  perfil_id: string;
  cantidad_piezas: number;
  formula_corte_ancho: string | null;
  formula_corte_alto: string | null;
  notas: string | null;
};

function TipologiasPage() {
  const [series, setSeries] = useState<Serie[]>([]);
  const [tipologias, setTipologias] = useState<Tipologia[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<{ serie_id?: string; nombre?: string; descripcion?: string }>({});

  async function loadAll() {
    const [s, t, p] = await Promise.all([
      supabase.from("series").select("id, nombre").order("nombre"),
      supabase.from("typologies").select("*").order("nombre"),
      supabase.from("materials").select("id, codigo_fabricante, nombre_estandarizado, serie_id").eq("categoria", "perfil"),
    ]);
    setSeries((s.data as Serie[]) ?? []);
    setTipologias((t.data as Tipologia[]) ?? []);
    setPerfiles((p.data as Perfil[]) ?? []);
  }
  useEffect(() => { loadAll(); }, []);

  async function addTip() {
    if (!form.serie_id || !form.nombre) return;
    const { error } = await supabase.from("typologies").insert({
      serie_id: form.serie_id, nombre: form.nombre, descripcion: form.descripcion || null,
    });
    if (error) { alert(error.message); return; }
    setForm({}); loadAll();
  }
  async function delTip(id: string) {
    await supabase.from("typologies").delete().eq("id", id);
    if (selected === id) setSelected(null);
    loadAll();
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-4">Tipologías</h1>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Crear tipología</h2>
          <div>
            <Label>Serie</Label>
            <Select value={form.serie_id ?? ""} onValueChange={(v)=>setForm({...form, serie_id: v})}>
              <SelectTrigger><SelectValue placeholder="Selecciona"/></SelectTrigger>
              <SelectContent>{series.map(s=><SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Nombre</Label><Input value={form.nombre ?? ""} onChange={(e)=>setForm({...form, nombre: e.target.value})} placeholder="Ventana Corrediza 2 hojas"/></div>
          <div><Label>Descripción</Label><Input value={form.descripcion ?? ""} onChange={(e)=>setForm({...form, descripcion: e.target.value})}/></div>
          <Button onClick={addTip} className="w-full"><Plus className="h-4 w-4 mr-1"/>Agregar</Button>

          <div className="pt-2">
            <h3 className="font-medium text-sm mb-2">Existentes</h3>
            <div className="space-y-1 max-h-96 overflow-auto">
              {tipologias.map(t => (
                <div key={t.id} className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer ${selected===t.id?"bg-accent":"hover:bg-accent/50"}`} onClick={()=>setSelected(t.id)}>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.nombre}</div>
                    <div className="text-xs text-muted-foreground">{series.find(s=>s.id===t.serie_id)?.nombre}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation(); delTip(t.id);}}><Trash2 className="h-4 w-4"/></Button>
                </div>
              ))}
              {tipologias.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay tipologías.</p>}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          {selected ? (
            <FormulasPanel tipologiaId={selected} perfiles={perfiles} tipologia={tipologias.find(t=>t.id===selected)!} series={series}/>
          ) : (
            <p className="text-muted-foreground">Selecciona una tipología para definir sus fórmulas de corte.</p>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function FormulasPanel({ tipologiaId, perfiles, tipologia, series }: { tipologiaId: string; perfiles: Perfil[]; tipologia: Tipologia; series: Serie[] }) {
  const [items, setItems] = useState<Formula[]>([]);
  const [form, setForm] = useState<Partial<Formula>>({ cantidad_piezas: 2 });

  const perfilesSerie = useMemo(
    () => perfiles.filter(p => !p.serie_id || p.serie_id === tipologia.serie_id),
    [perfiles, tipologia.serie_id]
  );

  async function load() {
    const { data } = await supabase.from("deductions_formulas").select("*").eq("tipologia_id", tipologiaId);
    setItems((data as Formula[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tipologiaId]);

  async function add() {
    if (!form.perfil_id) return;
    const { error } = await supabase.from("deductions_formulas").insert({
      tipologia_id: tipologiaId,
      perfil_id: form.perfil_id,
      cantidad_piezas: form.cantidad_piezas ?? 1,
      formula_corte_ancho: form.formula_corte_ancho || null,
      formula_corte_alto: form.formula_corte_alto || null,
      notas: form.notas || null,
    });
    if (error) { alert(error.message); return; }
    setForm({ cantidad_piezas: 2 }); load();
  }
  async function del(id: string) { await supabase.from("deductions_formulas").delete().eq("id", id); load(); }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold">{tipologia.nombre}</h2>
        <p className="text-xs text-muted-foreground">{series.find(s=>s.id===tipologia.serie_id)?.nombre} · usa <code>L</code> = ancho, <code>H</code> = alto. Ej: <code>L - 75</code></p>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <Label>Perfil</Label>
          <Select value={form.perfil_id ?? ""} onValueChange={(v)=>setForm({...form, perfil_id: v})}>
            <SelectTrigger><SelectValue placeholder="Perfil"/></SelectTrigger>
            <SelectContent>
              {perfilesSerie.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.codigo_fabricante} — {p.nombre_estandarizado ?? "—"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Pzas</Label><Input type="number" min={1} value={form.cantidad_piezas ?? 1} onChange={(e)=>setForm({...form, cantidad_piezas: Number(e.target.value)})}/></div>
        <div><Label>Fórmula ancho</Label><Input placeholder="L - 75" value={form.formula_corte_ancho ?? ""} onChange={(e)=>setForm({...form, formula_corte_ancho: e.target.value})}/></div>
        <div><Label>Fórmula alto</Label><Input placeholder="H - 20" value={form.formula_corte_alto ?? ""} onChange={(e)=>setForm({...form, formula_corte_alto: e.target.value})}/></div>
      </div>
      <Button onClick={add}><Plus className="h-4 w-4 mr-1"/>Agregar fórmula</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Perfil</TableHead><TableHead>Pzas</TableHead>
            <TableHead>F. Ancho</TableHead><TableHead>F. Alto</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(f => {
            const p = perfiles.find(x=>x.id===f.perfil_id);
            return (
              <TableRow key={f.id}>
                <TableCell className="text-sm">{p?.codigo_fabricante} — {p?.nombre_estandarizado}</TableCell>
                <TableCell>{f.cantidad_piezas}</TableCell>
                <TableCell className="font-mono text-xs">{f.formula_corte_ancho ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{f.formula_corte_alto ?? "—"}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={()=>del(f.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
