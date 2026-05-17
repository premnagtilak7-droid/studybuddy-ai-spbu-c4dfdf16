CREATE TABLE IF NOT EXISTS public.user_blocked_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  package_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, package_name)
);

ALTER TABLE public.user_blocked_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocked apps"
ON public.user_blocked_apps FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_blocked_apps_user ON public.user_blocked_apps(user_id);