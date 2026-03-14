
-- Error logs table for admin monitoring
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  error_type text NOT NULL DEFAULT 'runtime',
  error_message text NOT NULL,
  error_stack text,
  page_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all errors" ON public.error_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert errors" ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_type ON public.error_logs(error_type);
