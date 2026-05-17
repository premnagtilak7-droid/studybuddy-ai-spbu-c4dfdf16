CREATE TABLE public.user_formulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  unit_name TEXT NOT NULL DEFAULT 'Custom',
  name TEXT NOT NULL,
  latex TEXT NOT NULL DEFAULT '',
  plain_text TEXT NOT NULL DEFAULT '',
  variables TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own formulas" ON public.user_formulas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own formulas" ON public.user_formulas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own formulas" ON public.user_formulas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own formulas" ON public.user_formulas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_formulas_user_subject ON public.user_formulas(user_id, subject);

CREATE TRIGGER update_user_formulas_updated_at
BEFORE UPDATE ON public.user_formulas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();