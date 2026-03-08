
-- Mock test history table
CREATE TABLE public.mock_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  topic text,
  question_type text NOT NULL DEFAULT 'mixed',
  num_questions integer NOT NULL DEFAULT 10,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb DEFAULT '[]'::jsonb,
  score integer,
  total integer,
  duration_seconds integer,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tests" ON public.mock_tests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own tests" ON public.mock_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own tests" ON public.mock_tests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all tests" ON public.mock_tests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Formula sheets table
CREATE TABLE public.formula_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  units text[] NOT NULL DEFAULT '{}',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.formula_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sheets" ON public.formula_sheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own sheets" ON public.formula_sheets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sheets" ON public.formula_sheets FOR DELETE USING (auth.uid() = user_id);
