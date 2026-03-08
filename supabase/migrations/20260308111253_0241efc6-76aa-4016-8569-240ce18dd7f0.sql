
-- Daily study goals: stores user's target hours per day
CREATE TABLE public.daily_study_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_hours numeric(4,1) NOT NULL DEFAULT 4.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.daily_study_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal" ON public.daily_study_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goal" ON public.daily_study_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goal" ON public.daily_study_goals FOR UPDATE USING (auth.uid() = user_id);

-- Study logs: each row = one study session with duration in minutes
CREATE TABLE public.study_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  logged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.study_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.study_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.study_logs FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at on daily_study_goals
CREATE TRIGGER update_daily_study_goals_updated_at
  BEFORE UPDATE ON public.daily_study_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
