import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — Cancelería" }] }),
  component: Catalogo,
});

const PERFIL_NOMBRES = ["Jamba","Zoclo","Cabezal","Riel","Traslape","Junquillo","Interlock","Escalonado","Bolsa"] as const;
const HERRAJE_TIPOS = ["Bisagra","Carretilla","Escuadra","Felpa","Vinil","Cremona","Cierre","Brazo","Otro"] as const;

type Serie = { id: string; nombre: string; descripcion: string | null };
type Material = {
  id: string;
  categoria: "perfil" | "herraje" | "vidrio";
  codigo_fabricante: string;
  nombre_estandarizado: string | null;
  largo_estandar: number | null;
  peso: number | null;
  descripcion: string | null;
  herraje_tipo: string | null;
  vidrio_tipo: string | null;
  espesor_mm: number | null;
  serie_id: string | null;
};

function Catalogo() {
  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-4">Catálogo</h1>
      <Tabs defaultValue="series">
        <TabsList>
          <TabsTrigger value="series">Series</TabsTrigger>
          <TabsTrigger value="perfiles">Perfiles</TabsTrigger>
          <TabsTrigger value="herrajes">Herrajes</TabsTrigger>
          <TabsTrigger value="vidrios">Vidrios</TabsTrigger>
        </TabsList>
        <TabsContent value="series"><SeriesPanel /></TabsContent>
        <TabsContent value="perfiles"><MaterialesPanel categoria="perfil" /></TabsContent>
        <TabsContent value="herrajes"><MaterialesPanel categoria="herraje" /></TabsContent>
        <TabsContent value="vidrios"><MaterialesPanel categoria="vidrio" /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function SeriesPanel() {
  const [items, setItems] = useState<Serie[]>([]);
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");

  async function load() {
    const { data } = await supabase.from("series").select("*").order("nombre");
    setItems((data as Serie[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!nombre.trim()) return;
    await supabase.from("series").insert({ nombre, descripcion: desc || null });
    setNombre(""); setDesc(""); load();
  }
  async function del(id: string) {
    await supabase.from("series").delete().eq("id", id);
    load();
  }

  return (
    <Card className="p-4 mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-40"><Label>Nombre</Label><Input value={nombre} onChange={(e)=>setNombre(e.target.value)} placeholder="Serie 35" /></div>
        <div className="flex-1 min-w-40"><Label>Descripción</Label><Input value={desc} onChange={(e)=>setDesc(e.target.value)} /></div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1"/>Agregar</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map(s => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.nombre}</TableCell>
              <TableCell>{s.descripcion}</TableCell>
              <TableCell><Button size="sm" variant="ghost" onClick={()=>del(s.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function MaterialesPanel({ categoria }: { categoria: "perfil" | "herraje" | "vidrio" }) {
  const [items, setItems] = useState<Material[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [form, setForm] = useState<Partial<Material>>({});

  async function load() {
    const { data } = await supabase.from("materials").select("*").eq("categoria", categoria).order("codigo_fabricante");
    setItems((data as Material[]) ?? []);
    const { data: s } = await supabase.from("series").select("*").order("nombre");
    setSeries((s as Serie[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [categoria]);

  async function add() {
    if (!form.codigo_fabricante) return;
    const payload: any = { categoria, codigo_fabricante: form.codigo_fabricante, serie_id: form.serie_id || null };
    if (categoria === "perfil") {
      payload.nombre_estandarizado = form.nombre_estandarizado || null;
      payload.largo_estandar = form.largo_estandar ? Number(form.largo_estandar) : null;
      payload.peso = form.peso ? Number(form.peso) : null;
    } else if (categoria === "herraje") {
      payload.descripcion = form.descripcion || null;
      payload.herraje_tipo = form.herraje_tipo || null;
    } else {
      payload.vidrio_tipo = form.vidrio_tipo || null;
      payload.espesor_mm = form.espesor_mm ? Number(form.espesor_mm) : null;
    }
    const { error } = await supabase.from("materials").insert(payload);
    if (error) { alert(error.message); return; }
    setForm({}); load();
  }
  async function del(id: string) { await supabase.from("materials").delete().eq("id", id); load(); }

  return (
    <Card className="p-4 mt-4 space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label>Código fabricante</Label><Input value={form.codigo_fabricante ?? ""} onChange={(e)=>setForm({...form, codigo_fabricante: e.target.value})}/></div>
        <div>
          <Label>Serie</Label>
          <Select value={form.serie_id ?? "_"} onValueChange={(v)=>setForm({...form, serie_id: v === "_" ? null : v})}>
            <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="_">— sin serie —</SelectItem>
              {series.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {categoria === "perfil" && <>
          <div>
            <Label>Nombre estandarizado</Label>
            <Select value={form.nombre_estandarizado ?? "_"} onValueChange={(v)=>setForm({...form, nombre_estandarizado: v === "_" ? null : v})}>
              <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {PERFIL_NOMBRES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Largo estándar (mm)</Label><Input type="number" value={form.largo_estandar ?? ""} onChange={(e)=>setForm({...form, largo_estandar: e.target.value as any})}/></div>
          <div><Label>Peso (kg/m)</Label><Input type="number" step="0.01" value={form.peso ?? ""} onChange={(e)=>setForm({...form, peso: e.target.value as any})}/></div>
        </>}
        {categoria === "herraje" && <>
          <div>
            <Label>Tipo</Label>
            <Select value={form.herraje_tipo ?? "_"} onValueChange={(v)=>setForm({...form, herraje_tipo: v === "_" ? null : v})}>
              <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {HERRAJE_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Descripción</Label><Input value={form.descripcion ?? ""} onChange={(e)=>setForm({...form, descripcion: e.target.value})}/></div>
        </>}
        {categoria === "vidrio" && <>
          <div><Label>Tipo (Claro, Tintex, Templado…)</Label><Input value={form.vidrio_tipo ?? ""} onChange={(e)=>setForm({...form, vidrio_tipo: e.target.value})}/></div>
          <div><Label>Espesor (mm)</Label><Input type="number" step="0.1" value={form.espesor_mm ?? ""} onChange={(e)=>setForm({...form, espesor_mm: e.target.value as any})}/></div>
        </>}
      </div>
      <Button onClick={add}><Plus className="h-4 w-4 mr-1"/>Agregar</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            {categoria === "perfil" && <><TableHead>Nombre</TableHead><TableHead>Largo</TableHead><TableHead>Peso</TableHead></>}
            {categoria === "herraje" && <><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead></>}
            {categoria === "vidrio" && <><TableHead>Tipo</TableHead><TableHead>Espesor</TableHead></>}
            <TableHead>Serie</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(m => (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-sm">{m.codigo_fabricante}</TableCell>
              {categoria === "perfil" && <><TableCell>{m.nombre_estandarizado}</TableCell><TableCell>{m.largo_estandar}</TableCell><TableCell>{m.peso}</TableCell></>}
              {categoria === "herraje" && <><TableCell>{m.herraje_tipo}</TableCell><TableCell>{m.descripcion}</TableCell></>}
              {categoria === "vidrio" && <><TableCell>{m.vidrio_tipo}</TableCell><TableCell>{m.espesor_mm}</TableCell></>}
              <TableCell className="text-xs">{series.find(s=>s.id===m.serie_id)?.nombre ?? "—"}</TableCell>
              <TableCell><Button size="sm" variant="ghost" onClick={()=>del(m.id)}><Trash2 className="h-4 w-4"/></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
