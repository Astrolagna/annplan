
-- Projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select_own ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY projects_insert_own ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY projects_update_own ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY projects_delete_own ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project items table
CREATE TABLE public.project_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  is_done boolean NOT NULL DEFAULT false,
  due_date date NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_items_select_own ON public.project_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY project_items_insert_own ON public.project_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY project_items_update_own ON public.project_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY project_items_delete_own ON public.project_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_project_items_user_due ON public.project_items(user_id, due_date);
CREATE INDEX idx_project_items_project ON public.project_items(project_id, sort_order);

CREATE TRIGGER update_project_items_updated_at
  BEFORE UPDATE ON public.project_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
