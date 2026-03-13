
-- Add description and privacy to study_groups
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS privacy text NOT NULL DEFAULT 'public';

-- Group notifications table
CREATE TABLE public.group_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group notifications" ON public.group_notifications FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert group notifications" ON public.group_notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

-- Group assignments table
CREATE TABLE public.group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  deadline timestamptz,
  assigned_to uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group assignments" ON public.group_assignments FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));
CREATE POLICY "Admin can manage group assignments" ON public.group_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND group_id IN (SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()));
CREATE POLICY "Admin can update group assignments" ON public.group_assignments FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
CREATE POLICY "Admin can delete group assignments" ON public.group_assignments FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Group assignment completions
CREATE TABLE public.group_assignment_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.group_assignments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, user_id)
);
ALTER TABLE public.group_assignment_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view completions" ON public.group_assignment_completions FOR SELECT TO authenticated
  USING (assignment_id IN (SELECT id FROM public.group_assignments WHERE group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())));
CREATE POLICY "Users can mark own completion" ON public.group_assignment_completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own completion" ON public.group_assignment_completions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Group achievements table
CREATE TABLE public.group_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  badge_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, badge_key)
);
ALTER TABLE public.group_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group achievements" ON public.group_achievements FOR SELECT TO authenticated
  USING (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert group achievements" ON public.group_achievements FOR INSERT TO authenticated
  WITH CHECK (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()));

-- Enable realtime for group notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_assignments;
