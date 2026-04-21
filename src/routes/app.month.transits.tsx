import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { type AstroEvent, DAY_COLOR_BG, DAY_COLOR_LABEL, eventIcon } from "@/lib/astro";
import { formatDDMM, pad } from "@/lib/date-utils";

const searchSchema = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/month/transits")({
  validateSearch: zodValidator(searchSchema),
  component: MonthTransits,
});

function MonthTransits() {
  const search = Route.useSearch();
  const now = new Date();
  const yearMonth = search.ym ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [y, m] = yearMonth.split("-").map(Number);
  const first = `${yearMonth}-01`;
  const last = `${yearMonth}-${pad(new Date(y, m, 0).getDate())}`;

  const [events, setEvents] = useState<AstroEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("astro_events")
        .select("*")
        .gte("date", first)
        .lte("date", last)
        .order("date");
      if (!cancelled && data) setEvents(data as AstroEvent[]);
    })();
    return () => { cancelled = true; };
  }, [first, last]);

  if (events.length === 0) {
    return (
      <div className="card-soft p-10 text-center text-muted-foreground">
        В этом месяце транзитов в базе нет.
      </div>
    );
  }

  return (
    <div className="card-soft divide-y divide-border overflow-hidden">
      {events.map(ev => (
        <div key={ev.id} className="px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
          <div className="font-serif text-lg text-muted-foreground tabular-nums w-14 shrink-0">
            {formatDDMM(ev.date)}
          </div>
          <div className="text-xl shrink-0 mt-0.5" aria-hidden>{eventIcon(ev)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-base text-foreground">{ev.description_ru}</div>
            {ev.planet && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {ev.planet}{ev.sign ? ` · ${ev.sign}` : ""}
              </div>
            )}
          </div>
          <span
            className={
              "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs " +
              "bg-muted text-muted-foreground"
            }
          >
            <span className={"w-2 h-2 rounded-full " + DAY_COLOR_BG[ev.day_color]} />
            {DAY_COLOR_LABEL[ev.day_color]}
          </span>
        </div>
      ))}
    </div>
  );
}
