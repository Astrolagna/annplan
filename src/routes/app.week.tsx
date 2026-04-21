import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, fromISO, todayISO, toISO, weekDays, RU_MONTHS_GEN } from "@/lib/date-utils";

const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/week")({
  validateSearch: zodValidator(searchSchema),
  component: WeekLayout,
});

function WeekLayout() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const date = search.date ?? todayISO();
  const days = weekDays(fromISO(date));
  const first = days[0];
  const last = days[6];

  function shift(delta: number) {
    const next = toISO(addDays(fromISO(date), delta * 7));
    navigate({ to: ".", search: { date: next } });
  }

  const tabs = [
    { label: "План", to: "/app/week/plan" },
    { label: "Транзиты недели", to: "/app/week/transits" },
  ];

  const rangeLabel =
    first.getMonth() === last.getMonth()
      ? `${first.getDate()}–${last.getDate()} ${RU_MONTHS_GEN[first.getMonth()]} ${first.getFullYear()}`
      : `${first.getDate()} ${RU_MONTHS_GEN[first.getMonth()]} – ${last.getDate()} ${RU_MONTHS_GEN[last.getMonth()]} ${last.getFullYear()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-serif text-2xl sm:text-3xl min-w-[16rem] text-center">{rangeLabel}</h1>
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
                search={{ date }}
                className={
                  "px-4 py-1.5 text-sm rounded-full transition-all " +
                  (active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
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
