import { supabase } from "@/integrations/supabase/client";

export type TimerState = {
  id: string;
  user_id: string;
  mode: string;
  subject_id: string | null;
  started_at: string;
  elapsed_seconds: number;
  countdown_target_seconds: number | null;
  pomodoro_phase: string;
  pomodoro_sessions_done: number;
  is_running: boolean;
  paused_at: string | null;
  updated_at: string;
};

export async function getActiveTimer(): Promise<TimerState | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as TimerState | null;
}

export async function upsertTimer(state: Partial<TimerState> & { mode: string }): Promise<TimerState> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const existing = await getActiveTimer();
  
  if (existing) {
    const { data, error } = await supabase
      .from("timer_sessions")
      .update({ ...state, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as TimerState;
  }

  const { data, error } = await supabase
    .from("timer_sessions")
    .insert({ user_id: user.id, ...state })
    .select()
    .single();
  if (error) throw error;
  return data as TimerState;
}

export async function clearTimer(): Promise<void> {
  const existing = await getActiveTimer();
  if (existing) {
    await supabase.from("timer_sessions").delete().eq("id", existing.id);
  }
}
