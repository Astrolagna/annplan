import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RU_MONTHS } from "@/lib/date-utils";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/month")({
  validateSearch: zodValidator(searchSchema),
  component: MonthLayout,
});

function MonthLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const location = useLocation();

  const now = new Date();
  const currentYM = search.ym ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yStr, mStr] = currentYM.split("-");
  const year = Number(yStr);
  const month0 = Number(mStr) - 1;

  function shift(delta: number) {
    const d = new Date(year, month0 + delta, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    navigate({ to: ".", search: { ym }, replace: false });
  }

  const tabs = [
    { label: "Обзор", to: "/app/month/overview" },
    { label: "Цели месяца", to: "/app/month/goals" },
    { label: "Транзиты месяца", to: "/app/month/transits" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-3xl sm:text-4xl min-w-[14rem] text-center">
            {RU_MONTHS[month0]} {year}
          </h1>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} className="rounded-full">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex items-center gap-1 rounded-full bg-muted p-1">
          {tabs.map(t => {
            const active = location.pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                search={{ ym: currentYM }}
                className={
                  "px-4 py-1.5 text-sm rounded-full transition-all " +
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
      </div>

      <Outlet />
    </div>
  );
}
