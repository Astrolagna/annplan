import { createFileRoute, Outlet, Link, useNavigate, redirect, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { todayISO } from "@/lib/date-utils";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ location }) => {
    // Default landing: /app -> /app/month
    if (location.pathname === "/app" || location.pathname === "/app/") {
      throw redirect({ to: "/app/month/overview" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  const today = todayISO();
  const path = location.pathname;
  const tabs = [
    { label: "Месяц", to: "/app/month/overview", match: "/app/month" },
    { label: "Неделя", to: "/app/week/plan", match: "/app/week" },
    { label: "День", to: `/app/day?date=${today}`, match: "/app/day" },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/app/month/overview" className="flex items-center gap-2 group">
            <span className="text-xl">✦</span>
            <span className="font-serif text-xl tracking-tight">Джйотиш-планер</span>
          </Link>

          <nav className="flex items-center gap-1 rounded-full bg-muted p-1">
            {tabs.map(t => {
              const active = path.startsWith(t.match);
              return (
                <Link
                  key={t.match}
                  to={t.to}
                  className={
                    "px-4 sm:px-5 py-1.5 text-sm rounded-full transition-all " +
                    (active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Выйти</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
