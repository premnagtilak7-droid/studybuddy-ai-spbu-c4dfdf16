CREATE OR REPLACE FUNCTION public.auto_create_units()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.units (subject_id, unit_number, name)
  SELECT NEW.id, n, 'Unit ' || n
  FROM generate_series(1, 6) AS n
  ON CONFLICT (subject_id, unit_number) DO NOTHING;
  RETURN NEW;
END;
$$;