import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AutoGrowNote } from "@/components/auto-grow-note";
import {
  RU_WEEKDAYS_SHORT,
  fromISO,
  todayISO,
  toISO,
  weekDays,
  isToday,
} from "@/lib/date-utils";
import { type AstroEvent, dominantColor, groupByDate, DAY_COLOR_BG, eventIcon } from "@/lib/astro";

const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/week/plan")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: WeekPlan,
});

const SLOTS = Array.from({ length: 15 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);

type Task = {
  id: string;
  date: string;
  time_slot: string | null;
  title: string;
  is_done: boolean;
  sort_order: number;
};

type Note = { date: string; content: string };

type ProjectItem = {
  id: string;
  project_id: string;
  title: string;
  is_done: boolean;
  due_date: string;
};

type ProjectLite = { id: string; title: string };

function WeekPlan() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const date = search.date ?? todayISO();
  const days = useMemo(() => weekDays(fromISO(date)), [date]);
  const first = toISO(days[0]);
  const last = toISO(days[6]);

  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [evRes, taskRes, noteRes, piRes, pRes] = await Promise.all([
        supabase.from("astro_events").select("*").gte("date", first).lte("date", last),
        supabase.from("tasks").select("*").eq("user_id", user.id).gte("date", first).lte("date", last).order("sort_order"),
        supabase.from("notes").select("date,content").eq("user_id", user.id).gte("date", first).lte("date", last),
        supabase.from("project_items").select("id,project_id,title,is_done,due_date").eq("user_id", user.id).gte("due_date", first).lte("due_date", last),
        supabase.from("projects").select("id,title").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      if (evRes.data) setEvents(evRes.data as AstroEvent[]);
      if (taskRes.data) setTasks(taskRes.data as Task[]);
      const m: Record<string, string> = {};
      for (const n of (noteRes.data as Note[] | null) ?? []) m[n.date] = n.content;
      setNotes(m);
      setProjectItems((piRes.data ?? []) as ProjectItem[]);
      setProjects((pRes.data ?? []) as ProjectLite[]);
    })();
    return () => { cancelled = true; };
  }, [user, first, last]);

  async function saveNote(day: string, content: string) {
    if (!user) return;
    const trimmed = content.trim();
    if (trimmed === "") {
      await supabase.from("notes").delete().eq("user_id", user.id).eq("date", day);
    } else {
      await supabase.from("notes").upsert(
        { user_id: user.id, date: day, content: trimmed },
        { onConflict: "user_id,date" },
      );
    }
  }

  const byDate = groupByDate(events);

  function tasksFor(day: string, slot: string) {
    return tasks.filter(t => t.date === day && t.time_slot === slot);
  }

  async function addTask(day: string, slot: string, title: string) {
    if (!user || !title.trim()) return;
    const { data } = await supabase
      .from("tasks")
      .insert({ user_id: user.id, date: day, time_slot: slot, title: title.trim(), sort_order: Date.now() })
      .select()
      .single();
    if (data) setTasks(t => [...t, data as Task]);
  }

  async function toggleTask(t: Task) {
    const next = !t.is_done;
    setTasks(arr => arr.map(x => (x.id === t.id ? { ...x, is_done: next } : x)));
    await supabase.from("tasks").update({ is_done: next }).eq("id", t.id);
  }

  async function deleteTask(t: Task) {
    setTasks(arr => arr.filter(x => x.id !== t.id));
    await supabase.from("tasks").delete().eq("id", t.id);
  }

  async function toggleProjectItem(it: ProjectItem) {
    const next = !it.is_done;
    setProjectItems(arr => arr.map(x => (x.id === it.id ? { ...x, is_done: next } : x)));
    await supabase.from("project_items").update({ is_done: next }).eq("id", it.id);
  }

  const projectTitle = (id: string) => projects.find(p => p.id === id)?.title || "Проект";

  return (
    <div className="card-soft overflow-x-auto">
      <div className="grid grid-cols-[60px_repeat(7,minmax(120px,1fr))] min-w-[900px]">
        {/* Header row */}
        <div className="border-b border-r border-border bg-muted/40" />
        {days.map((d, i) => {
          const iso = toISO(d);
          const color = dominantColor(byDate[iso] ?? []);
          const today = isToday(d);
          return (
            <button
              key={iso}
              onClick={() => navigate({ to: "/app/day", search: { date: iso } })}
              className={"text-left border-b border-r border-border last:border-r-0 hover:bg-muted/40 transition-colors " + (today ? "bg-primary-soft/40" : "bg-muted/20")}
            >
              <div className={"h-1.5 " + (color ? DAY_COLOR_BG[color] : "bg-transparent")} />
              <div className="px-3 py-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{RU_WEEKDAYS_SHORT[i]}</div>
                <div className="font-serif text-xl">{d.getDate()}</div>
                <div className="flex gap-1 text-[11px] mt-0.5 h-4">
                  {(byDate[iso] ?? []).slice(0, 3).map(ev => (
                    <span key={ev.id} aria-hidden>{eventIcon(ev)}</span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}

        {/* Notes row */}
        <div className="border-r border-b border-border px-2 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider sticky left-0 bg-card flex items-start">
          заметки
        </div>
        {days.map(d => {
          const iso = toISO(d);
          return (
            <div key={"note-" + iso} className="border-r border-b border-border last:border-r-0 p-1">
              <AutoGrowNote
                value={notes[iso] ?? ""}
                onChange={v => setNotes(n => ({ ...n, [iso]: v }))}
                onBlur={v => saveNote(iso, v)}
              />
            </div>
          );
        })}

        {/* Time slots */}
        {SLOTS.map(slot => (
          <FragmentRow key={slot}>
            <div className="border-r border-b border-border px-2 py-2 text-xs text-muted-foreground tabular-nums sticky left-0 bg-card">
              {slot}
            </div>
            {days.map(d => {
              const iso = toISO(d);
              const slotTasks = tasksFor(iso, slot);
              return (
                <SlotCell
                  key={iso + slot}
                  tasks={slotTasks}
                  onAdd={(title) => addTask(iso, slot, title)}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              );
            })}
          </FragmentRow>
        ))}
      </div>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function SlotCell({
  tasks,
  onAdd,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  onAdd: (t: string) => void;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="border-r border-b border-border last:border-r-0 p-1.5 min-h-[58px] flex flex-col gap-1">
      {tasks.map(t => (
        <div key={t.id} className="group flex items-center gap-1.5 text-xs bg-muted/40 rounded-md px-1.5 py-1">
          <button
            onClick={() => onToggle(t)}
            className={
              "w-3 h-3 rounded-full border shrink-0 " +
              (t.is_done ? "bg-secondary border-secondary" : "border-muted-foreground/40")
            }
            aria-label="отметить"
          />
          <span className={"flex-1 break-words " + (t.is_done ? "line-through text-muted-foreground" : "")}>
            {t.title}
          </span>
          <button
            onClick={() => onDelete(t)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs"
            aria-label="удалить"
          >
            ×
          </button>
        </div>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && draft.trim()) {
            onAdd(draft);
            setDraft("");
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            onAdd(draft);
            setDraft("");
          }
        }}
        placeholder="+"
        className="text-xs bg-transparent placeholder:text-muted-foreground/40 focus:outline-none focus:bg-muted/30 rounded px-1 py-0.5 transition-colors"
      />
    </div>
  );
}
