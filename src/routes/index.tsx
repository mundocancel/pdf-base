import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Boxes, Layers, Calculator } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cancelería · Gestor de aluminio" },
      { name: "description", content: "Catálogo, tipologías y cotizador con despiece automático para cancelería de aluminio." },
    ],
  }),
  component: Index,
});

const CARDS = [
  { to: "/catalogo", title: "Catálogo", desc: "Series, perfiles, herrajes y vidrios.", icon: Boxes },
  { to: "/tipologias", title: "Tipologías", desc: "Modelos de ventana y fórmulas de corte.", icon: Layers },
  { to: "/cotizador", title: "Cotizador", desc: "Ingresa L y H y obtén el despiece exacto.", icon: Calculator },
];

function Index() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bienvenido</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo de aluminio y genera despieces.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.to} to={c.to}>
                <Card className="p-6 hover:bg-accent transition cursor-pointer h-full">
                  <Icon className="h-8 w-8 mb-3 text-primary" />
                  <h2 className="font-semibold text-lg">{c.title}</h2>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
