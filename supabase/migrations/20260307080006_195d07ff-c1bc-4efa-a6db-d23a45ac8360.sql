
-- Create priority enum for topics
CREATE TYPE public.topic_priority AS ENUM ('high', 'medium', 'low');

-- Units table (6 per subject for SPPU)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  unit_number INTEGER NOT NULL CHECK (unit_number >= 1 AND unit_number <= 6),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, unit_number)
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own units" ON public.units FOR SELECT TO authenticated
  USING (subject_id IN (SELECT id FROM public.subjects WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own units" ON public.units FOR INSERT TO authenticated
  WITH CHECK (subject_id IN (SELECT id FROM public.subjects WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own units" ON public.units FOR UPDATE TO authenticated
  USING (subject_id IN (SELECT id FROM public.subjects WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own units" ON public.units FOR DELETE TO authenticated
  USING (subject_id IN (SELECT id FROM public.subjects WHERE user_id = auth.uid()));

-- Topics table (belongs to units)
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  priority topic_priority NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topics" ON public.topics FOR SELECT TO authenticated
  USING (unit_id IN (SELECT u.id FROM public.units u JOIN public.subjects s ON u.subject_id = s.id WHERE s.user_id = auth.uid()));
CREATE POLICY "Users can insert own topics" ON public.topics FOR INSERT TO authenticated
  WITH CHECK (unit_id IN (SELECT u.id FROM public.units u JOIN public.subjects s ON u.subject_id = s.id WHERE s.user_id = auth.uid()));
CREATE POLICY "Users can update own topics" ON public.topics FOR UPDATE TO authenticated
  USING (unit_id IN (SELECT u.id FROM public.units u JOIN public.subjects s ON u.subject_id = s.id WHERE s.user_id = auth.uid()));
CREATE POLICY "Users can delete own topics" ON public.topics FOR DELETE TO authenticated
  USING (unit_id IN (SELECT u.id FROM public.units u JOIN public.subjects s ON u.subject_id = s.id WHERE s.user_id = auth.uid()));

-- Doubt history table
CREATE TABLE public.doubt_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  image_url TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.doubt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own doubts" ON public.doubt_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own doubts" ON public.doubt_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own doubts" ON public.doubt_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Exam dates table (global from admin + per-user overrides)
CREATE TABLE public.exam_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  label TEXT DEFAULT 'Exam',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam dates" ON public.exam_dates FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_global = true);
CREATE POLICY "Users can insert own exam dates" ON public.exam_dates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exam dates" ON public.exam_dates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exam dates" ON public.exam_dates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all exam dates" ON public.exam_dates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create 6 units when a subject is created
CREATE OR REPLACE FUNCTION public.auto_create_units()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.units (subject_id, unit_number, name)
  SELECT NEW.id, n, 'Unit ' || n
  FROM generate_series(1, 6) AS n;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_units_on_subject
  AFTER INSERT ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_units();
