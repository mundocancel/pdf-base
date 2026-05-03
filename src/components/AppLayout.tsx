import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Boxes, Layers, Calculator, LogOut } from "lucide-react";

const NAV = [
  { to: "/", label: "Inicio", icon: Boxes },
  { to: "/catalogo", label: "Catálogo", icon: Boxes },
  { to: "/tipologias", label: "Tipologías", icon: Layers },
  { to: "/cotizador", label: "Cotizador", icon: Calculator },
];

export function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session && path !== "/auth") navigate({ to: "/auth" });
  }, [loading, session, navigate, path]);

  if (loading) return <div className="p-8 text-muted-foreground">Cargando…</div>;
  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex flex-wrap items-center gap-2 py-3 px-4">
          <h1 className="font-semibold mr-4">Cancelería · Gestor</h1>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((n) => {
              const active = path === n.to || (n.to !== "/" && path.startsWith(n.to));
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{session.user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
