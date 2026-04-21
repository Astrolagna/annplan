import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave, statusLabel } from "@/lib/use-autosave";
import { pad } from "@/lib/date-utils";

const searchSchema = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/month/goals")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: MonthGoals,
});

type Goal = {
  id?: string;
  slot: number;
  title: string;
  description: string;
  is_done: boolean;
};

function MonthGoals() {
  const search = Route.useSearch();
  const { user } = useAuth();
  const now = new Date();
  const yearMonth = search.ym ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  const [goals, setGoals] = useState<Goal[]>(
    Array.from({ length: 5 }, (_, i) => ({ slot: i + 1, title: "", description: "", is_done: false })),
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("goals_monthly")
        .select("*")
        .eq("user_id", user.id)
        .eq("year_month", yearMonth);
      if (cancelled) return;
      const next = Array.from({ length: 5 }, (_, i) => {
        const found = data?.find(g => g.slot === i + 1);
        return found
          ? { id: found.id, slot: found.slot, title: found.title, description: found.description, is_done: found.is_done }
          : { slot: i + 1, title: "", description: "", is_done: false };
      });
      setGoals(next);
    })();
    return () => { cancelled = true; };
  }, [user, yearMonth]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {goals.map((g, i) => (
        <GoalCard
          key={g.slot}
          goal={g}
          yearMonth={yearMonth}
          onChange={updated => {
            const next = [...goals];
            next[i] = updated;
            setGoals(next);
          }}
        />
      ))}
    </div>
  );
}

function GoalCard({
  goal,
  yearMonth,
  onChange,
}: {
  goal: Goal;
  yearMonth: string;
  onChange: (g: Goal) => void;
}) {
  const { user } = useAuth();
  const { status, run } = useAutoSave();

  async function persist(next: Goal) {
    if (!user) return;
    const isEmpty = next.title.trim() === "" && next.description.trim() === "" && !next.is_done;
    if (isEmpty && !next.id) return;
    const { data, error } = await supabase
      .from("goals_monthly")
      .upsert(
        {
          id: next.id,
          user_id: user.id,
          year_month: yearMonth,
          slot: next.slot,
          title: next.title,
          description: next.description,
          is_done: next.is_done,
        },
        { onConflict: "user_id,year_month,slot" },
      )
      .select()
      .single();
    if (error) throw error;
    if (data) onChange({ ...next, id: data.id });
  }

  return (
    <div className="card-soft p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-serif text-2xl text-muted-foreground">№{goal.slot}</span>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={goal.is_done}
            onCheckedChange={(v) => {
              const next = { ...goal, is_done: !!v };
              onChange(next);
              run(() => persist(next));
            }}
          />
          <span className={goal.is_done ? "line-through text-muted-foreground" : "text-muted-foreground"}>
            выполнено
          </span>
        </label>
      </div>
      <Input
        value={goal.title}
        placeholder="Название цели…"
        onChange={e => onChange({ ...goal, title: e.target.value })}
        onBlur={() => run(() => persist(goal))}
        className="border-0 border-b border-border rounded-none px-0 text-base font-serif focus-visible:ring-0 focus-visible:border-primary"
      />
      <Textarea
        value={goal.description}
        placeholder="Опишите шаги, мотивацию, контекст…"
        onChange={e => onChange({ ...goal, description: e.target.value })}
        onBlur={() => run(() => persist(goal))}
        rows={4}
        className="resize-none border-border rounded-xl"
      />
      <div className="text-xs text-muted-foreground italic min-h-[1rem]">{statusLabel(status)}</div>
    </div>
  );
}
