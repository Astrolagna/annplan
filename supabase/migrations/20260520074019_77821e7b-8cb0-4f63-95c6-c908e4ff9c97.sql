CREATE TABLE public.content_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  content text NOT NULL DEFAULT '',
  socials text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_posts_user_date ON public.content_posts(user_id, date);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_posts_select_own ON public.content_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY content_posts_insert_own ON public.content_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY content_posts_update_own ON public.content_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY content_posts_delete_own ON public.content_posts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_content_posts_updated_at
BEFORE UPDATE ON public.content_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();