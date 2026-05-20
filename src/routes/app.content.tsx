import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  RU_WEEKDAYS_SHORT,
  monthGrid,
  toISO,
  isSameMonth,
  isToday,
  pad,
  formatLong,
} from "@/lib/date-utils";
import { SOCIALS, SOCIAL_MAP, type SocialKey } from "@/lib/socials";
import {
  type AstroEvent,
  groupByDate,
  dominantColor,
  eventIcon,
  DAY_COLOR_BG,
} from "@/lib/astro";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  ym: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/app/content")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: ContentPlan,
});

export type ContentPost = {
  id: string;
  date: string;
  content: string;
  socials: string[];
  sort_order: number;
};

function ContentPlan() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();

  const now = new Date();
  const currentYM = search.ym ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [yStr, mStr] = currentYM.split("-");
  const year = Number(yStr);
  const month0 = Number(mStr) - 1;

  const grid = useMemo(() => monthGrid(year, month0), [year, month0]);
  const firstISO = toISO(grid[0]);
  const lastISO = toISO(grid[grid.length - 1]);

  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [events, setEvents] = useState<AstroEvent[]>([]);
  const [openDate, setOpenDate] = useState<string | null>(null);

  async function reload() {
    const [postsRes, evRes] = await Promise.all([
      user
        ? supabase
            .from("content_posts")
            .select("id,date,content,socials,sort_order")
            .eq("user_id", user.id)
            .gte("date", firstISO)
            .lte("date", lastISO)
            .order("sort_order")
        : Promise.resolve({ data: [] as ContentPost[] }),
      supabase
        .from("astro_events")
        .select("*")
        .gte("date", firstISO)
        .lte("date", lastISO)
        .order("date"),
    ]);
    setPosts((postsRes.data ?? []) as ContentPost[]);
    setEvents((evRes.data ?? []) as AstroEvent[]);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firstISO, lastISO]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month0 + delta, 1);
    navigate({ search: { ym: `${d.getFullYear()}-${pad(d.getMonth() + 1)}` } });
  }

  const postsByDate = useMemo(() => {
    const m: Record<string, ContentPost[]> = {};
    for (const p of posts) (m[p.date] ||= []).push(p);
    return m;
  }, [posts]);

  async function addPost(date: string) {
    if (!user) return;
    const dayPosts = postsByDate[date] ?? [];
    const nextOrder = dayPosts.length > 0 ? Math.max(...dayPosts.map(p => p.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from("content_posts")
      .insert({ user_id: user.id, date, content: "", socials: [], sort_order: nextOrder })
      .select()
      .single();
    if (data) setPosts(arr => [...arr, data as ContentPost]);
  }

  async function updatePost(id: string, patch: Partial<Pick<ContentPost, "content" | "socials">>) {
    setPosts(arr => arr.map(p => (p.id === id ? { ...p, ...patch } : p)));
    await supabase.from("content_posts").update(patch).eq("id", id);
  }

  async function deletePost(id: string) {
    setPosts(arr => arr.filter(p => p.id !== id));
    await supabase.from("content_posts").delete().eq("id", id);
  }

  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(year, month0, 1),
  );

  const dialogPosts = openDate ? postsByDate[openDate] ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl sm:text-3xl capitalize">{monthLabel}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)}>← Пред</Button>
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)}>След →</Button>
        </div>
      </div>

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
            const today = isToday(d);
            const dayPosts = postsByDate[iso] ?? [];
            return (
              <button
                key={idx}
                onClick={() => inMonth && setOpenDate(iso)}
                disabled={!inMonth}
                className={cn(
                  "min-h-[120px] border-r border-b border-border last:border-r-0 p-2 flex flex-col gap-1 text-left transition-colors group",
                  inMonth ? "bg-card hover:bg-muted/30" : "bg-muted/20 text-muted-foreground cursor-default",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-sm font-medium leading-none w-6 h-6 flex items-center justify-center rounded-full",
                      today && "bg-primary text-primary-foreground",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {inMonth && (
                    <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {dayPosts.map(p => (
                    <PostPreview key={p.id} post={p} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!openDate} onOpenChange={o => !o && setOpenDate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {openDate && `Посты на ${formatLong(openDate)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialogPosts.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Нет постов на эту дату.</p>
            )}
            {dialogPosts.map(p => (
              <PostEditor
                key={p.id}
                post={p}
                onChange={patch => updatePost(p.id, patch)}
                onDelete={() => deletePost(p.id)}
              />
            ))}
            <Button
              variant="outline"
              onClick={() => openDate && addPost(openDate)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" /> Добавить пост
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PostPreview({ post }: { post: ContentPost }) {
  return (
    <div className="text-[11px] leading-tight bg-accent/40 rounded px-1.5 py-1 flex items-start gap-1 overflow-hidden">
      <span className="flex gap-0.5 shrink-0">
        {post.socials.slice(0, 4).map(s => (
          <span key={s} className="text-[10px]" title={SOCIAL_MAP[s]?.label}>
            {SOCIAL_MAP[s]?.icon ?? s}
          </span>
        ))}
      </span>
      <span className="truncate flex-1">{post.content || "(пусто)"}</span>
    </div>
  );
}

export function PostEditor({
  post,
  onChange,
  onDelete,
}: {
  post: ContentPost;
  onChange: (patch: Partial<Pick<ContentPost, "content" | "socials">>) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(post.content);
  useEffect(() => setText(post.content), [post.id]);

  function toggleSocial(key: SocialKey) {
    const next = post.socials.includes(key)
      ? post.socials.filter(s => s !== key)
      : [...post.socials, key];
    onChange({ socials: next });
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
      <div className="flex items-start gap-2">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => text !== post.content && onChange({ content: text })}
          placeholder="Текст поста…"
          rows={4}
          className="flex-1 resize-none text-sm"
        />
        <Button variant="ghost" size="icon" onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SOCIALS.map(s => {
          const active = post.socials.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggleSocial(s.key)}
              className={cn(
                "text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50",
              )}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {active && <X className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
