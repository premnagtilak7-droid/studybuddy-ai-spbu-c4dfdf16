ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_unit_number_check;
ALTER TABLE public.units ADD CONSTRAINT units_unit_number_check CHECK (unit_number >= 1 AND unit_number <= 30);