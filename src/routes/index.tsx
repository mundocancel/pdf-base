import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_RULES,
  type ExtractionResult,
  type ExtractionRule,
  downloadFile,
  exportCSV,
  extractPdf,
} from "@/lib/pdf-extract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Upload, Download, Trash2, Plus, History } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PDF Extractor — Extrae datos clave de tus PDFs" },
      {
        name: "description",
        content:
          "App ligera para subir PDFs, extraer texto, detectar fechas, emails, montos y exportar a CSV/JSON.",
      },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "pdf-extractor-history";
const RULES_KEY = "pdf-extractor-rules";

function Index() {
  const [rules, setRules] = useState<ExtractionRule[]>(DEFAULT_RULES);
  const [history, setHistory] = useState<ExtractionResult[]>([]);
  const [current, setCurrent] = useState<ExtractionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const h = localStorage.getItem(STORAGE_KEY);
      if (h) setHistory(JSON.parse(h));
      const r = localStorage.getItem(RULES_KEY);
      if (r) setRules(JSON.parse(r));
    } catch {}
  }, []);

  const persistHistory = (next: ExtractionResult[]) => {
    setHistory(next);
    // drop heavy text from storage to save quota
    const slim = next.map((r) => ({ ...r, text: r.text.slice(0, 5000) }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {}
  };

  const persistRules = (next: ExtractionRule[]) => {
    setRules(next);
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files).find((f) =>
        f.name.toLowerCase().endsWith(".pdf")
      );
      if (!file) return;
      setBusy(true);
      setProgress(0);
      setCurrent(null);
      try {
        const result = await extractPdf(file, rules, (p) => setProgress(p));
        setCurrent(result);
        persistHistory([result, ...history].slice(0, 20));
      } catch (e) {
        console.error(e);
        alert("Error procesando el PDF");
      } finally {
        setBusy(false);
        setProgress(0);
      }
    },
    [rules, history]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const filtered = useMemo(() => {
    if (!current) return [];
    const q = filter.toLowerCase().trim();
    if (!q) return current.fields;
    return current.fields.filter(
      (f) =>
        f.value.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q)
    );
  }, [current, filter]);

  const grouped = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((f) => m.set(f.type, (m.get(f.type) || 0) + 1));
    return Array.from(m.entries());
  }, [filtered]);

  const addRule = () => {
    persistRules([...rules, { name: "Nuevo", pattern: "", flags: "g" }]);
  };

  const updateRule = (i: number, patch: Partial<ExtractionRule>) => {
    persistRules(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRule = (i: number) => {
    persistRules(rules.filter((_, idx) => idx !== i));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">PDF Extractor</h1>
            <p className="text-xs text-muted-foreground">
              Sube → Procesa → Exporta
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Dropzone */}
          <Card
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-accent" : "border-border"
            }`}
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Arrastra un PDF aquí</p>
            <p className="text-sm text-muted-foreground">
              o haz clic para seleccionar un archivo
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Button
              className="mt-4"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              Seleccionar PDF
            </Button>
            {busy && (
              <div className="mt-5">
                <Progress value={progress * 100} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Procesando… {Math.round(progress * 100)}%
                </p>
              </div>
            )}
          </Card>

          {/* Results */}
          {current && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold">{current.fileName}</h2>
                  <p className="text-xs text-muted-foreground">
                    {current.pages} páginas · {current.fields.length} datos
                    detectados
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadFile(
                        exportCSV(current.fields),
                        current.fileName.replace(/\.pdf$/i, "") + ".csv",
                        "text/csv"
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      downloadFile(
                        JSON.stringify(current, null, 2),
                        current.fileName.replace(/\.pdf$/i, "") + ".json",
                        "application/json"
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-1" /> JSON
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {grouped.map(([t, n]) => (
                  <Badge key={t} variant="secondary">
                    {t}: {n}
                  </Badge>
                ))}
              </div>

              <Tabs defaultValue="fields">
                <TabsList>
                  <TabsTrigger value="fields">Datos</TabsTrigger>
                  <TabsTrigger value="text">Texto</TabsTrigger>
                </TabsList>
                <TabsContent value="fields" className="space-y-3">
                  <Input
                    placeholder="Filtrar resultados…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  <div className="rounded-md border max-h-[420px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Tipo</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead className="w-20 text-right">Pág.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((f, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Badge variant="outline">{f.type}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm break-all">
                              {f.value}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {f.page}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground py-8"
                            >
                              Sin resultados
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                <TabsContent value="text">
                  <pre className="text-xs whitespace-pre-wrap max-h-[420px] overflow-auto rounded-md border bg-muted p-3">
                    {current.text}
                  </pre>
                </TabsContent>
              </Tabs>
            </Card>
          )}
        </div>

        {/* Sidebar: rules + history */}
        <aside className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Reglas de extracción</h3>
              <Button size="sm" variant="ghost" onClick={addRule}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto">
              {rules.map((r, i) => (
                <div key={i} className="space-y-1 rounded-md border p-2">
                  <div className="flex gap-1">
                    <Input
                      className="h-7 text-xs"
                      value={r.name}
                      onChange={(e) => updateRule(i, { name: e.target.value })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeRule(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    className="h-7 text-xs font-mono"
                    placeholder="Patrón regex"
                    value={r.pattern}
                    onChange={(e) => updateRule(i, { pattern: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Historial</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aún no hay archivos procesados.
              </p>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-auto">
                {history.map((h, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setCurrent(h)}
                      className="w-full text-left rounded-md p-2 hover:bg-accent text-xs"
                    >
                      <div className="font-medium truncate">{h.fileName}</div>
                      <div className="text-muted-foreground">
                        {h.fields.length} datos ·{" "}
                        {new Date(h.processedAt).toLocaleString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {history.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => persistHistory([])}
              >
                Limpiar historial
              </Button>
            )}
          </Card>
        </aside>
      </main>
    </div>
  );
}
