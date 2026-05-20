import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowRight, Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AutoGrowNote } from "@/components/auto-grow-note";
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
import { SOCIAL_MAP } from "@/lib/socials";

type ContentPost = { id: string; date: string; content: string; socials: string[] };

const searchSchema = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/month/overview")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: MonthOverview,
});

type Task = {
  id: string;
  date: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  time_slot: string | null;
};

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
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [projectItemsByDate, setProjectItemsByDate] = useState<Record<string, Array<{ id: string; project_id: string; title: string; is_done: boolean }>>>({});
  const [projects, setProjects] = useState<Record<string, string>>({});
  // Local draft text per date: only pending (not done) tasks, one per line.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const { status, run } = useAutoSave();

  async function reloadTasks() {
    if (!user) {
      setTasksByDate({});
      setDrafts({});
      return;
    }
    const { data } = await supabase
      .from("tasks")
      .select("id,date,title,is_done,sort_order,time_slot")
      .eq("user_id", user.id)
      .gte("date", firstISO)
      .lte("date", lastISO)
      .order("sort_order");
    const grouped: Record<string, Task[]> = {};
    for (const t of (data as Task[] | null) ?? []) {
      (grouped[t.date] ||= []).push(t);
    }
    setTasksByDate(grouped);
    const d: Record<string, string> = {};
    for (const [date, list] of Object.entries(grouped)) {
      d[date] = list
        .filter(t => !t.is_done && !t.time_slot)
        .map(t => t.title)
        .join("\n");
    }
    setDrafts(d);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [evRes, piRes, pRes] = await Promise.all([
        supabase.from("astro_events").select("*").gte("date", firstISO).lte("date", lastISO).order("date"),
        user
          ? supabase.from("project_items").select("id,project_id,title,is_done,due_date").eq("user_id", user.id).gte("due_date", firstISO).lte("due_date", lastISO)
          : Promise.resolve({ data: [] as Array<{ id: string; project_id: string; title: string; is_done: boolean; due_date: string }> }),
        user
          ? supabase.from("projects").select("id,title").eq("user_id", user.id)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      ]);
      if (cancelled) return;
      if (evRes.data) setEvents(evRes.data as AstroEvent[]);
      const piGrouped: Record<string, Array<{ id: string; project_id: string; title: string; is_done: boolean }>> = {};
      for (const it of (piRes.data ?? []) as Array<{ id: string; project_id: string; title: string; is_done: boolean; due_date: string }>) {
        (piGrouped[it.due_date] ||= []).push({ id: it.id, project_id: it.project_id, title: it.title, is_done: it.is_done });
      }
      setProjectItemsByDate(piGrouped);
      const pMap: Record<string, string> = {};
      for (const p of (pRes.data ?? []) as Array<{ id: string; title: string }>) pMap[p.id] = p.title;
      setProjects(pMap);
      await reloadTasks();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstISO, lastISO, user]);

  const byDate = useMemo(() => groupByDate(events), [events]);

  // Diff drafts vs existing pending tasks; create/update/delete accordingly.
  async function syncTasks(date: string, text: string) {
    if (!user) return;
    setActiveDate(date);
    await run(async () => {
      const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
      const existing = (tasksByDate[date] ?? []).filter(t => !t.is_done && !t.time_slot);

      const toUpdate: { id: string; title: string; sort_order: number }[] = [];
      const toInsert: { user_id: string; date: string; title: string; sort_order: number }[] = [];
      const usedIds = new Set<string>();

      lines.forEach((title, idx) => {
        const match = existing.find(t => !usedIds.has(t.id) && t.title === title);
        if (match) {
          usedIds.add(match.id);
          if (match.sort_order !== idx) {
            toUpdate.push({ id: match.id, title, sort_order: idx });
          }
        } else {
          // Reuse a free slot if any (treat as rename) — preserves ids on edits.
          const free = existing.find(t => !usedIds.has(t.id));
          if (free) {
            usedIds.add(free.id);
            toUpdate.push({ id: free.id, title, sort_order: idx });
          } else {
            toInsert.push({ user_id: user.id, date, title, sort_order: idx });
          }
        }
      });

      const toDelete = existing.filter(t => !usedIds.has(t.id)).map(t => t.id);

      if (toDelete.length) {
        const { error } = await supabase.from("tasks").delete().in("id", toDelete);
        if (error) throw error;
      }
      for (const u of toUpdate) {
        const { error } = await supabase
          .from("tasks")
          .update({ title: u.title, sort_order: u.sort_order })
          .eq("id", u.id);
        if (error) throw error;
      }
      if (toInsert.length) {
        const { error } = await supabase.from("tasks").insert(toInsert);
        if (error) throw error;
      }
    });
    await reloadTasks();
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
            const dayTasks = tasksByDate[iso] ?? [];
            const doneTasks = dayTasks.filter(t => t.is_done && !t.time_slot);
            return (
              <div
                key={idx}
                className={
                  "min-h-[140px] border-r border-b border-border last:border-r-0 p-2 flex flex-col gap-1 transition-colors group " +
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

                {inMonth && (projectItemsByDate[iso] ?? []).length > 0 && (
                  <ul className="space-y-0.5">
                    {(projectItemsByDate[iso] ?? []).map(it => (
                      <li
                        key={it.id}
                        className={
                          "text-[11px] leading-tight px-1.5 truncate rounded bg-primary/10 text-primary " +
                          (it.is_done ? "line-through opacity-60" : "")
                        }
                        title={(projects[it.project_id] || "Проект") + ": " + it.title}
                      >
                        <span className="font-medium">{projects[it.project_id] || "Проект"}:</span> {it.title}
                      </li>
                    ))}
                  </ul>
                )}

                {inMonth && doneTasks.length > 0 && (
                  <ul className="space-y-0.5">
                    {doneTasks.map(t => (
                      <li key={t.id} className="flex items-center gap-1 text-[11px] leading-tight text-muted-foreground line-through px-1.5">
                        <Check className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {inMonth && (
                  <AutoGrowNote
                    value={drafts[iso] ?? ""}
                    onChange={v => setDrafts(n => ({ ...n, [iso]: v }))}
                    onFocus={() => setActiveDate(iso)}
                    onBlur={v => syncTasks(iso, v)}
                    placeholder="задача…"
                    className="mt-auto"
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
      <span className="ml-2 italic">Каждая строка = задача в Дне</span>
    </div>
  );
}
