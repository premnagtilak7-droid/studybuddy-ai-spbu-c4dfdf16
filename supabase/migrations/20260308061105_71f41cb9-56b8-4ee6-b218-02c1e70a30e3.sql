
-- Attach missing triggers
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_on_signup();

CREATE OR REPLACE TRIGGER on_subject_created_auto_units
  AFTER INSERT ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_units();

CREATE OR REPLACE TRIGGER on_subject_updated
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add target_grade column to subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS target_grade numeric(3,1) DEFAULT NULL;
