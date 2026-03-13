
CREATE TABLE public.feature_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  description text DEFAULT '',
  required_plan text NOT NULL DEFAULT 'pro',
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.feature_controls ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature controls
CREATE POLICY "Anyone can read feature controls"
  ON public.feature_controls FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage feature controls"
  ON public.feature_controls FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default feature controls
INSERT INTO public.feature_controls (feature_key, feature_name, description, required_plan) VALUES
  ('ai_solver', 'AI Doubt Solver', 'AI-powered doubt solving', 'pro'),
  ('study_plan', 'AI Study Plan', 'AI study plan generator', 'pro'),
  ('mock_test', 'AI Mock Test', 'AI-generated mock tests', 'pro'),
  ('subtopics', 'Subtopics', 'Subtopic tracking within units', 'pro'),
  ('pomodoro', 'Pomodoro Timer', 'Pomodoro timer mode', 'pro'),
  ('countdown', 'Countdown Timer', 'Countdown timer mode', 'pro'),
  ('reminders', 'Study Reminders', 'Push notification reminders', 'pro'),
  ('heatmap', 'Study Heatmap', 'GitHub-style study heatmap', 'pro'),
  ('badges', 'Badges & Achievements', 'Gamification badges', 'pro'),
  ('analytics', 'Analytics', 'Study analytics dashboard', 'pro'),
  ('unlimited_subjects', 'Unlimited Subjects', 'No subject/unit limits', 'pro'),
  ('full_timetable', 'Full Timetable', 'Calendar timetable views', 'pro'),
  ('answer_checker', 'AI Answer Checker', 'AI answer evaluation', 'elite'),
  ('formula_sheet', 'AI Formula Sheet', 'AI-generated formula sheets', 'elite'),
  ('exam_predictor', 'AI Exam Predictor', 'Exam prediction AI', 'elite'),
  ('study_groups', 'Study Groups', 'Group study with video call', 'elite'),
  ('study_buddy', 'Study Buddy', 'Friend matching system', 'elite'),
  ('doubt_forum', 'Doubt Forum', 'Community doubt forum', 'elite'),
  ('share_progress', 'Share Progress', 'Progress sharing cards', 'elite'),
  ('batch_feed', 'Batch Feed', 'Batch community feed', 'elite'),
  ('flashcards', 'Flashcard Maker', 'Spaced repetition flashcards', 'elite'),
  ('formula_bank', 'Formula Bank', 'Formula storage & search', 'elite'),
  ('attendance', 'Attendance Tracker', 'Lecture attendance tracking', 'elite'),
  ('marks', 'Marks Tracker', 'Marks & CGPA tracking', 'elite'),
  ('assignments', 'Assignments', 'Assignment & lab tracker', 'elite'),
  ('focus_mode', 'Focus Mode', 'Distraction-free study mode', 'elite')
ON CONFLICT (feature_key) DO NOTHING;
