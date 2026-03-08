
-- Admin SELECT policies for tables queried in admin dashboard
CREATE POLICY "Admins can view all study_logs"
  ON public.study_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all subjects"
  ON public.subjects FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all topics"
  ON public.topics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all doubts"
  ON public.doubt_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all study_plans"
  ON public.study_plans FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
