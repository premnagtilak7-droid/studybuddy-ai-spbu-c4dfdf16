
-- Study reminders table for subject-specific study reminders
CREATE TABLE public.study_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  reminder_time TEXT NOT NULL, -- HH:MM format
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders" ON public.study_reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for study_reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_reminders;
