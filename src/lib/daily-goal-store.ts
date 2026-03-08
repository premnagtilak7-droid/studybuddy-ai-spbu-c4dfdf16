import { supabase } from "@/integrations/supabase/client";

export async function getDailyGoal(): Promise<number> {
  const { data } = await supabase
    .from("daily_study_goals")
    .select("target_hours")
    .maybeSingle();
  return data?.target_hours ?? 4;
}

export async function setDailyGoal(targetHours: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("daily_study_goals")
    .upsert({ user_id: user.id, target_hours: targetHours }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function getTodayStudyMinutes(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("study_logs")
    .select("duration_minutes")
    .gte("logged_at", today.toISOString());

  return (data || []).reduce((sum, row) => sum + (row.duration_minutes || 0), 0);
}

export async function logStudyMinutes(minutes: number, subjectId?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("study_logs")
    .insert({
      user_id: user.id,
      duration_minutes: minutes,
      subject_id: subjectId || null,
    });
  if (error) throw error;
}
