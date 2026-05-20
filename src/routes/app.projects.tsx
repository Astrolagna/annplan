import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { fromISO, toISO } from "@/lib/date-utils";

export const Route = createFileRoute("/app/projects")({
  component: ProjectsPage,
});

type Project = {
  id: string;
  title: string;
  sort_order: number;
};

type Item = {
  id: string;
  project_id: string;
  title: string;
  is_done: boolean;
  due_date: string | null;
  sort_order: number;
};

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [pRes, iRes] = await Promise.all([
        supabase.from("projects").select("*").eq("user_id", user.id).order("sort_order"),
        supabase.from("project_items").select("*").eq("user_id", user.id).order("sort_order"),
      ]);
      if (cancelled) return;
      setProjects((pRes.data as Project[] | null) ?? []);
      setItems((iRes.data as Item[] | null) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function addProject() {
    if (!user) return;
    const nextOrder = projects.length > 0 ? Math.max(...projects.map(p => p.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from("projects")
      .insert({ user_id: user.id, title: "Новый проект", sort_order: nextOrder })
      .select()
      .single();
    if (data) setProjects(p => [...p, data as Project]);
  }

  async function updateProjectTitle(p: Project, title: string) {
    setProjects(arr => arr.map(x => (x.id === p.id ? { ...x, title } : x)));
    await supabase.from("projects").update({ title }).eq("id", p.id);
  }

  async function deleteProject(p: Project) {
    setProjects(arr => arr.filter(x => x.id !== p.id));
    setItems(arr => arr.filter(x => x.project_id !== p.id));
    await supabase.from("projects").delete().eq("id", p.id);
  }

  async function addItem(projectId: string, title: string) {
    if (!user || !title.trim()) return;
    const siblings = items.filter(i => i.project_id === projectId);
    const nextOrder = siblings.length > 0 ? Math.max(...siblings.map(i => i.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from("project_items")
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: title.trim(),
        sort_order: nextOrder,
      })
      .select()
      .single();
    if (data) setItems(arr => [...arr, data as Item]);
  }

  async function toggleItem(it: Item) {
    const next = !it.is_done;
    setItems(arr => arr.map(x => (x.id === it.id ? { ...x, is_done: next } : x)));
    await supabase.from("project_items").update({ is_done: next }).eq("id", it.id);
  }

  async function updateItemTitle(it: Item, title: string) {
    setItems(arr => arr.map(x => (x.id === it.id ? { ...x, title } : x)));
    await supabase.from("project_items").update({ title }).eq("id", it.id);
  }

  async function updateItemDate(it: Item, due: string | null) {
    setItems(arr => arr.map(x => (x.id === it.id ? { ...x, due_date: due } : x)));
    await supabase.from("project_items").update({ due_date: due }).eq("id", it.id);
  }

  async function deleteItem(it: Item) {
    setItems(arr => arr.filter(x => x.id !== it.id));
    await supabase.from("project_items").delete().eq("id", it.id);
  }

  if (loading) {
    return <div className="text-muted-foreground text-sm">Загрузка…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-serif text-3xl sm:text-4xl">Проекты</h1>
        <Button onClick={addProject} className="rounded-full">
          <Plus className="w-4 h-4 mr-1" />
          Новый проект
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="card-soft p-10 text-center text-muted-foreground">
          Пока нет проектов. Создайте первый — это может быть «Работа», «Дом», «Учёба» или любая отдельная область жизни.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.map(p => (
            <ProjectColumn
              key={p.id}
              project={p}
              items={items.filter(i => i.project_id === p.id).sort((a, b) => a.sort_order - b.sort_order)}
              onTitleChange={(t) => updateProjectTitle(p, t)}
              onDelete={() => deleteProject(p)}
              onAddItem={(t) => addItem(p.id, t)}
              onToggleItem={toggleItem}
              onUpdateItemTitle={updateItemTitle}
              onUpdateItemDate={updateItemDate}
              onDeleteItem={deleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectColumn({
  project,
  items,
  onTitleChange,
  onDelete,
  onAddItem,
  onToggleItem,
  onUpdateItemTitle,
  onUpdateItemDate,
  onDeleteItem,
}: {
  project: Project;
  items: Item[];
  onTitleChange: (t: string) => void;
  onDelete: () => void;
  onAddItem: (t: string) => void;
  onToggleItem: (it: Item) => void;
  onUpdateItemTitle: (it: Item, t: string) => void;
  onUpdateItemDate: (it: Item, d: string | null) => void;
  onDeleteItem: (it: Item) => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [draft, setDraft] = useState("");

  useEffect(() => { setTitle(project.title); }, [project.title]);

  return (
    <div className="card-soft p-4 w-[300px] shrink-0 flex flex-col gap-3 max-h-[calc(100vh-220px)]">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title !== project.title && onTitleChange(title.trim() || "Без названия")}
          className="flex-1 bg-transparent font-serif text-xl focus:outline-none focus:bg-muted/40 rounded px-1 py-0.5 transition-colors"
          placeholder="Название…"
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              aria-label="Удалить проект"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить проект «{project.title || "Без названия"}»?</AlertDialogTitle>
              <AlertDialogDescription>
                Все пункты этого проекта и их даты в календарях будут удалены. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ul className="space-y-1.5 overflow-y-auto flex-1 -mx-1 px-1">
        {items.map(it => (
          <ItemRow
            key={it.id}
            item={it}
            onToggle={() => onToggleItem(it)}
            onTitleChange={(t) => onUpdateItemTitle(it, t)}
            onDateChange={(d) => onUpdateItemDate(it, d)}
            onDelete={() => onDeleteItem(it)}
          />
        ))}
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground italic px-2 py-1">Пока ничего нет.</li>
        )}
      </ul>

      <div className="flex gap-1.5 pt-2 border-t border-border">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onAddItem(draft);
              setDraft("");
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              onAddItem(draft);
              setDraft("");
            }
          }}
          placeholder="+ пункт"
          className="rounded-lg h-8 text-sm"
        />
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onTitleChange,
  onDateChange,
  onDelete,
}: {
  item: Item;
  onToggle: () => void;
  onTitleChange: (t: string) => void;
  onDateChange: (d: string | null) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [open, setOpen] = useState(false);

  useEffect(() => { setTitle(item.title); }, [item.title]);

  const dueDate = item.due_date ? fromISO(item.due_date) : undefined;

  return (
    <li className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
      <Checkbox checked={item.is_done} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <textarea
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title !== item.title && onTitleChange(title.trim())}
          rows={1}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          className={cn(
            "bg-transparent focus:outline-none text-sm w-full resize-none break-words whitespace-pre-wrap leading-snug",
            item.is_done && "line-through text-muted-foreground"
          )}
        />
        {item.due_date && (
          <span className="text-[11px] text-primary leading-none">
            {format(fromISO(item.due_date), "d MMM", { locale: ru })}
          </span>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground",
              item.due_date && "opacity-100 text-primary"
            )}
            aria-label="Поставить дату"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dueDate}
            onSelect={(d) => {
              onDateChange(d ? toISO(d) : null);
              setOpen(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          {item.due_date && (
            <div className="p-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onDateChange(null); setOpen(false); }}
                className="w-full text-xs"
              >
                <X className="w-3 h-3 mr-1" /> Убрать дату
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
        aria-label="удалить"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
