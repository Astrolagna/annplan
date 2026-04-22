import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave, statusLabel } from "@/lib/use-autosave";
import {
  RU_WEEKDAYS_SHORT,
  monthGrid,
  toISO,
  isSameMonth,
  isToday,
  pad,
} from "@/lib/date-utils";
import {
  type AstroEvent,
  groupByDate,
  dominantColor,
  eventIcon,
  DAY_COLOR_BG,
} from "@/lib/astro";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const searchSchema = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/month/overview")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: MonthOverview,
});

type Note = { date: string; content: string };

function MonthOverview() {
  const search = Route.useSearch();
  const { user } = useAuth();

  const now = new Date();
  const currentYM = search.ym ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [yStr, mStr] = currentYM.split("-");
  const year = Number(yStr);
  const month0 = Number(mStr) - 1;

  const grid = useMemo(() => monthGrid(year, month0), [year, month0]);
  const firstISO = toISO(grid[0]);
  const lastISO = toISO(grid[grid.length - 1]);

  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const { status, run } = useAutoSave();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [evRes, noteRes] = await Promise.all([
        supabase
          .from("astro_events")
          .select("*")
          .gte("date", firstISO)
          .lte("date", lastISO)
          .order("date"),
        user
          ? supabase
              .from("notes")
              .select("date,content")
              .eq("user_id", user.id)
              .gte("date", firstISO)
              .lte("date", lastISO)
          : Promise.resolve({ data: [] as Note[], error: null }),
      ]);
      if (cancelled) return;
      if (evRes.data) setEvents(evRes.data as AstroEvent[]);
      const m: Record<string, string> = {};
      for (const n of (noteRes.data as Note[] | null) ?? []) m[n.date] = n.content;
      setNotes(m);
    })();
    return () => { cancelled = true; };
  }, [firstISO, lastISO, user]);

  const byDate = useMemo(() => groupByDate(events), [events]);

  async function saveNote(date: string, content: string) {
    if (!user) return;
    setActiveDate(date);
    await run(async () => {
      const trimmed = content.trim();
      if (trimmed === "") {
        const { error } = await supabase.from("notes").delete().eq("user_id", user.id).eq("date", date);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").upsert(
          { user_id: user.id, date, content: trimmed },
          { onConflict: "user_id,date" },
        );
        if (error) throw error;
      }
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="card-soft overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/40 border-b border-border">
          {RU_WEEKDAYS_SHORT.map(w => (
            <div key={w} className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground text-center font-medium">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, idx) => {
            const iso = toISO(d);
            const inMonth = isSameMonth(d, year, month0);
            const dayEvents = byDate[iso] ?? [];
            const color = dominantColor(dayEvents);
            const today = isToday(d);
            return (
              <div
                key={idx}
                className={
                  "min-h-[130px] sm:min-h-[140px] border-r border-b border-border last:border-r-0 p-2 flex flex-col gap-1 transition-colors group " +
                  (inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground")
                }
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 justify-between">
                      <span
                        className={
                          "text-sm font-medium leading-none w-6 h-6 flex items-center justify-center rounded-full " +
                          (today ? "bg-primary text-primary-foreground" : "")
                        }
                      >
                        {d.getDate()}
                      </span>
                      <div className="flex items-center gap-1">
                        {color && (
                          <span className={"inline-block w-2 h-2 rounded-full " + DAY_COLOR_BG[color]} />
                        )}
                        {dayEvents.slice(0, 2).map(ev => (
                          <span key={ev.id} className="text-[11px] leading-none" aria-hidden>
                            {eventIcon(ev)}
                          </span>
                        ))}
                        {inMonth && (
                          <Link
                            to="/app/day"
                            search={{ date: iso }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            aria-label="Открыть день"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  {dayEvents.length > 0 && (
                    <TooltipContent side="top" className="max-w-xs">
                      <ul className="space-y-1 text-xs">
                        {dayEvents.map(ev => (
                          <li key={ev.id}>
                            <span className="mr-1">{eventIcon(ev)}</span>
                            {ev.description_ru}
                          </li>
                        ))}
                      </ul>
                    </TooltipContent>
                  )}
                </Tooltip>

                {inMonth && (
                  <Textarea
                    value={notes[iso] ?? ""}
                    onChange={e => setNotes(n => ({ ...n, [iso]: e.target.value }))}
                    onFocus={() => setActiveDate(iso)}
                    onBlur={e => saveNote(iso, e.target.value)}
                    placeholder="заметка…"
                    rows={2}
                    className="mt-auto min-h-[44px] text-xs leading-tight bg-muted/30 border-0 shadow-none px-1.5 py-1 resize-none focus-visible:ring-1 focus-visible:bg-card"
                  />
                )}
                {activeDate === iso && status !== "idle" && (
                  <span className="text-[10px] text-muted-foreground italic">{statusLabel(status)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Legend />
    </TooltipProvider>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-day-green)]" />
        Благоприятный
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-day-pink)]" />
        Сложный
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-day-grey)]" />
        Нейтральный
      </span>
      <span className="ml-2 flex items-center gap-3">
        <span>🌑 новолуние</span>
        <span>🌕 полнолуние</span>
        <span>℞ ретроград</span>
        <span>→ переход в знак</span>
      </span>
    </div>
  );
}
