import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { addDays, formatLong, fromISO, toISO, todayISO, RU_WEEKDAYS_FULL } from "@/lib/date-utils";
import {
  type AstroEvent,
  type Planet,
  DAY_COLOR_BG,
  DAY_COLOR_LABEL,
  PLANETS,
  PLANET_GLYPH,
  PLANET_RU,
  currentPositions,
  dominantColor,
  eventIcon,
  retrogradePlanets,
  signRu,
} from "@/lib/astro";
import { useAutoSave, statusLabel } from "@/lib/use-autosave";

const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/day")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: DayPage,
});

type Task = {
  id: string;
  date: string;
  title: string;
  is_done: boolean;
  sort_order: number;
};

function DayPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const date = search.date ?? todayISO();
  const d = fromISO(date);
  const weekdayIdx = (d.getDay() + 6) % 7;

  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [positions, setPositions] = useState<Partial<Record<Planet, string>>>({});
  const [retro, setRetro] = useState<Set<Planet>>(new Set());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const noteSave = useAutoSave();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Wide lookback for slow planets (Jupiter ~12y cycle, Saturn ~30y, Rahu/Ketu ~18y).
      // Also look forward to support fallback for planets with no past ingress in dataset.
      const lookbackFrom = toISO(addDays(fromISO(date), -800));
      const lookforwardTo = toISO(addDays(fromISO(date), 800));
      const [evRes, ingRes, retroRes, tRes, nRes] = await Promise.all([
        supabase.from("astro_events").select("*").eq("date", date).order("event_type"),
        supabase
          .from("astro_events")
          .select("planet,sign,date")
          .eq("event_type", "ingress")
          .gte("date", lookbackFrom)
          .lte("date", lookforwardTo),
        supabase
          .from("astro_events")
          .select("planet,event_type,date")
          .in("event_type", ["retrograde", "ingress"])
          .gte("date", lookbackFrom)
          .lte("date", date),
        supabase.from("tasks").select("*").eq("user_id", user.id).eq("date", date).is("time_slot", null).order("sort_order"),
        supabase.from("notes").select("content").eq("user_id", user.id).eq("date", date).maybeSingle(),
      ]);
      if (cancelled) return;
      setEvents((evRes.data ?? []) as AstroEvent[]);
      setPositions(currentPositions((ingRes.data ?? []) as Array<{ planet: string | null; sign: string | null; date: string }>, date));
      setRetro(retrogradePlanets((retroRes.data ?? []) as Array<{ planet: string | null; event_type: string; date: string }>, date));
      setTasks((tRes.data ?? []) as Task[]);
      setNote(nRes.data?.content ?? "");
    })();
    return () => { cancelled = true; };
  }, [user, date]);

  function shift(delta: number) {
    navigate({ to: ".", search: { date: toISO(addDays(d, delta)) } });
  }

  async function addTask() {
    if (!user || !draft.trim()) return;
    const { data } = await supabase
      .from("tasks")
      .insert({ user_id: user.id, date, title: draft.trim(), sort_order: Date.now() })
      .select()
      .single();
    if (data) {
      setTasks(t => [...t, data as Task]);
      setDraft("");
    }
  }

  async function toggleTask(t: Task) {
    const next = !t.is_done;
    setTasks(arr => arr.map(x => x.id === t.id ? { ...x, is_done: next } : x));
    await supabase.from("tasks").update({ is_done: next }).eq("id", t.id);
  }

  async function updateTitle(t: Task, title: string) {
    setTasks(arr => arr.map(x => x.id === t.id ? { ...x, title } : x));
    await supabase.from("tasks").update({ title }).eq("id", t.id);
  }

  async function deleteTask(t: Task) {
    setTasks(arr => arr.filter(x => x.id !== t.id));
    await supabase.from("tasks").delete().eq("id", t.id);
  }

  async function saveNote() {
    if (!user) return;
    await noteSave.run(async () => {
      const trimmed = note.trim();
      if (trimmed === "") {
        await supabase.from("notes").delete().eq("user_id", user.id).eq("date", date);
      } else {
        await supabase.from("notes").upsert(
          { user_id: user.id, date, content: trimmed },
          { onConflict: "user_id,date" },
        );
      }
    });
  }

  const color = dominantColor(events);

  return (
    <div className="space-y-6">
      {/* Date nav */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => shift(-1)} className="rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{RU_WEEKDAYS_FULL[weekdayIdx]}</div>
          <h1 className="font-serif text-3xl sm:text-4xl">{formatLong(date)}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => shift(1)} className="rounded-full">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Astro */}
        <aside className="card-soft p-6 space-y-4 lg:col-span-1 h-fit">
          <h2 className="font-serif text-2xl">Астро дня</h2>

          {color ? (
            <div className={"rounded-xl px-4 py-3 flex items-center gap-3 " + DAY_COLOR_BG[color]}>
              <span className="text-2xl">{color === "green" ? "🌿" : color === "pink" ? "🌹" : "◌"}</span>
              <div>
                <div className="text-sm uppercase tracking-wider opacity-80">День</div>
                <div className="font-serif text-xl text-foreground">{DAY_COLOR_LABEL[color]}</div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl px-4 py-3 bg-muted text-muted-foreground text-sm">
              Сегодня без отмеченных транзитов — спокойное поле дня.
            </div>
          )}

          <div className="space-y-3 pt-2">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-sans">Положение планет</h3>
            <ul className="grid grid-cols-1 gap-1.5">
              {PLANETS.map(p => {
                const sign = positions[p];
                if (!sign) return null;
                const isRetro = retro.has(p);
                return (
                  <li key={p} className="flex items-baseline gap-2 text-sm">
                    <span className="text-base w-5 text-muted-foreground shrink-0" aria-hidden>{PLANET_GLYPH[p]}</span>
                    <span className="text-muted-foreground">{PLANET_RU[p]}</span>
                    <span className="text-foreground">— {signRu(sign)}</span>
                    {isRetro && (
                      <span
                        className="ml-1 text-xs font-medium text-[var(--color-day-pink)] tracking-wide"
                        title="Ретроград"
                      >
                        ℞ ретро
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {events.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground font-sans">Активные транзиты</h3>
              <ul className="space-y-3">
                {events.map(ev => (
                  <li key={ev.id} className="flex gap-3">
                    <span className="text-lg shrink-0 mt-0.5" aria-hidden>{eventIcon(ev)}</span>
                    <div className="text-sm leading-relaxed">{ev.description_ru}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* Right: Tasks + Notes */}
        <section className="lg:col-span-2 space-y-6">
          <div className="card-soft p-6">
            <h2 className="font-serif text-2xl mb-4">Задачи</h2>
            <ul className="space-y-2 mb-4">
              {tasks.map(t => (
                <li key={t.id} className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/40 transition-colors">
                  <Checkbox checked={t.is_done} onCheckedChange={() => toggleTask(t)} />
                  <input
                    value={t.title}
                    onChange={e => setTasks(arr => arr.map(x => x.id === t.id ? { ...x, title: e.target.value } : x))}
                    onBlur={e => updateTitle(t, e.target.value)}
                    className={
                      "flex-1 bg-transparent focus:outline-none text-sm " +
                      (t.is_done ? "line-through text-muted-foreground" : "")
                    }
                  />
                  <button
                    onClick={() => deleteTask(t)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label="удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
              {tasks.length === 0 && (
                <li className="text-sm text-muted-foreground italic px-3 py-2">Пока ничего не запланировано.</li>
              )}
            </ul>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask()}
                placeholder="Добавить задачу…"
                className="rounded-xl"
              />
              <Button onClick={addTask} className="rounded-xl">Добавить</Button>
            </div>
          </div>

          <div className="card-soft p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-2xl">Заметки</h2>
              <span className="text-xs text-muted-foreground italic">{statusLabel(noteSave.status)}</span>
            </div>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={saveNote}
              rows={8}
              placeholder="Свободные мысли о дне, наблюдения, чувства…"
              className="resize-none rounded-xl"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
