
ALTER TABLE public.topics ADD COLUMN completed_at timestamptz DEFAULT NULL;

-- Backfill: set completed_at to created_at for already-completed topics
UPDATE public.topics SET completed_at = created_at WHERE is_completed = true AND completed_at IS NULL;
