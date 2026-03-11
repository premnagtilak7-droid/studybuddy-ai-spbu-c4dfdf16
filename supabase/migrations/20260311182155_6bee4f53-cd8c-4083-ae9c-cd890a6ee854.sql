
-- 1. Fix auto_create_units to use target_units instead of hardcoded 6
CREATE OR REPLACE FUNCTION public.auto_create_units()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.units (subject_id, unit_number, name)
  SELECT NEW.id, n, 'Unit ' || n
  FROM generate_series(1, NEW.target_units) AS n
  ON CONFLICT (subject_id, unit_number) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2. Create subtopics table
CREATE TABLE IF NOT EXISTS public.subtopics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subtopics" ON public.subtopics
  FOR SELECT TO authenticated
  USING (topic_id IN (
    SELECT t.id FROM topics t
    JOIN units u ON t.unit_id = u.id
    JOIN subjects s ON u.subject_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own subtopics" ON public.subtopics
  FOR INSERT TO authenticated
  WITH CHECK (topic_id IN (
    SELECT t.id FROM topics t
    JOIN units u ON t.unit_id = u.id
    JOIN subjects s ON u.subject_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own subtopics" ON public.subtopics
  FOR UPDATE TO authenticated
  USING (topic_id IN (
    SELECT t.id FROM topics t
    JOIN units u ON t.unit_id = u.id
    JOIN subjects s ON u.subject_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own subtopics" ON public.subtopics
  FOR DELETE TO authenticated
  USING (topic_id IN (
    SELECT t.id FROM topics t
    JOIN units u ON t.unit_id = u.id
    JOIN subjects s ON u.subject_id = s.id
    WHERE s.user_id = auth.uid()
  ));

-- 3. Create timer_sessions table for cross-device timer persistence
CREATE TABLE IF NOT EXISTS public.timer_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'stopwatch',
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  countdown_target_seconds INTEGER,
  pomodoro_phase TEXT DEFAULT 'focus',
  pomodoro_sessions_done INTEGER DEFAULT 0,
  is_running BOOLEAN NOT NULL DEFAULT false,
  paused_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own timer" ON public.timer_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Create timetable_sessions table to replace localStorage
CREATE TABLE IF NOT EXISTS public.timetable_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT DEFAULT '',
  start_time TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '1h',
  session_type TEXT NOT NULL DEFAULT 'Study',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  color TEXT NOT NULL DEFAULT 'chart-1',
  repeat_type TEXT NOT NULL DEFAULT 'once',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own timetable" ON public.timetable_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Create study_dates table to replace localStorage streak tracking
CREATE TABLE IF NOT EXISTS public.study_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, study_date)
);

ALTER TABLE public.study_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own study dates" ON public.study_dates
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Add notes column to study_logs if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='study_logs' AND column_name='notes') THEN
    ALTER TABLE public.study_logs ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='study_logs' AND column_name='mode') THEN
    ALTER TABLE public.study_logs ADD COLUMN mode TEXT DEFAULT 'manual';
  END IF;
END $$;

-- 7. Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtopics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timer_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_dates;
