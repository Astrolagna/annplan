import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { type AstroEvent, DAY_COLOR_BG, DAY_COLOR_LABEL, eventIcon } from "@/lib/astro";
import { formatDDMM, fromISO, toISO, todayISO, weekDays } from "@/lib/date-utils";

const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/week/transits")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: WeekTransits,
});

function WeekTransits() {
  const search = Route.useSearch();
  const date = search.date ?? todayISO();
  const days = weekDays(fromISO(date));
  const first = toISO(days[0]);
  const last = toISO(days[6]);

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
    return <div className="card-soft p-10 text-center text-muted-foreground">На этой неделе транзитов нет — спокойное время.</div>;
  }

  return (
    <div className="card-soft divide-y divide-border overflow-hidden">
      {events.map(ev => (
        <div key={ev.id} className="px-5 py-3.5 flex items-start gap-4">
          <div className="font-serif text-lg text-muted-foreground tabular-nums w-14 shrink-0">{formatDDMM(ev.date)}</div>
          <div className="text-xl shrink-0 mt-0.5" aria-hidden>{eventIcon(ev)}</div>
          <div className="flex-1 min-w-0 text-sm">{ev.description_ru}</div>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted text-muted-foreground">
            <span className={"w-2 h-2 rounded-full " + DAY_COLOR_BG[ev.day_color]} />
            {DAY_COLOR_LABEL[ev.day_color]}
          </span>
        </div>
      ))}
    </div>
  );
}
