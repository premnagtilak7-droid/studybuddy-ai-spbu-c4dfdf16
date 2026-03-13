
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS college text,
ADD COLUMN IF NOT EXISTS branch text,
ADD COLUMN IF NOT EXISTS year_of_study text,
ADD COLUMN IF NOT EXISTS exam_target text,
ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS is_trial_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Update handle_new_user to set trial fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, trial_start, trial_end, is_trial_active)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    now(),
    now() + interval '7 days',
    true
  );
  RETURN NEW;
END;
$$;
