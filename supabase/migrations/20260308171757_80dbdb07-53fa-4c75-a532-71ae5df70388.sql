
-- Flashcard Decks
CREATE TABLE public.flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  topic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own decks" ON public.flashcard_decks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Flashcards
CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'known', 'review')),
  next_review_at timestamptz NOT NULL DEFAULT now(),
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cards" ON public.flashcards FOR ALL TO authenticated
  USING (deck_id IN (SELECT id FROM public.flashcard_decks WHERE user_id = auth.uid()))
  WITH CHECK (deck_id IN (SELECT id FROM public.flashcard_decks WHERE user_id = auth.uid()));

-- Formula Bank
CREATE TABLE public.formula_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  name text NOT NULL,
  formula text NOT NULL,
  variables text,
  example text,
  is_custom boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.formula_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own formulas" ON public.formula_bank FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Formula Bookmarks
CREATE TABLE public.formula_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  formula_id uuid NOT NULL REFERENCES public.formula_bank(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, formula_id)
);
ALTER TABLE public.formula_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bookmarks" ON public.formula_bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Attendance
CREATE TABLE public.attendance_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_name text NOT NULL,
  lectures_per_week integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own attendance subjects" ON public.attendance_subjects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.attendance_subjects(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own attendance" ON public.attendance_records FOR ALL TO authenticated
  USING (subject_id IN (SELECT id FROM public.attendance_subjects WHERE user_id = auth.uid()))
  WITH CHECK (subject_id IN (SELECT id FROM public.attendance_subjects WHERE user_id = auth.uid()));

-- Marks Tracker
CREATE TABLE public.marks_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_name text NOT NULL,
  ia1_marks numeric,
  ia1_total numeric NOT NULL DEFAULT 30,
  ia2_marks numeric,
  ia2_total numeric NOT NULL DEFAULT 30,
  assignment_marks numeric,
  assignment_total numeric NOT NULL DEFAULT 20,
  attendance_marks numeric,
  attendance_total numeric NOT NULL DEFAULT 10,
  target_grade text,
  credits integer NOT NULL DEFAULT 3,
  semester integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marks_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own marks" ON public.marks_tracker FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CGPA History
CREATE TABLE public.cgpa_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  semester integer NOT NULL,
  sgpa numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, semester)
);
ALTER TABLE public.cgpa_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cgpa" ON public.cgpa_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Assignments
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  deadline date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'late')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own assignments" ON public.assignments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lab Experiments
CREATE TABLE public.lab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  experiment_name text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own labs" ON public.lab_experiments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Focus Sessions
CREATE TABLE public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  duration_minutes integer NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own focus sessions" ON public.focus_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
