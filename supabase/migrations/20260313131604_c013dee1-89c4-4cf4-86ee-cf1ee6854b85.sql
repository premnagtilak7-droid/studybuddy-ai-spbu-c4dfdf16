
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS education_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS education_details jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.education_type IS 'school, undergraduate, postgraduate, competitive_exam, professional, self_learning';
COMMENT ON COLUMN public.profiles.education_details IS 'JSON with type-specific fields like class, board, course, semester, exam_name, etc.';
