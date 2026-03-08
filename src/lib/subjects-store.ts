import { supabase } from "@/integrations/supabase/client";

export type UserSubject = {
  id: string;
  user_id: string;
  name: string;
  code: string;
  target_units: number;
  completed_units: number;
  color: string;
  target_grade: number | null;
  created_at: string;
  updated_at: string;
};

const COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

export async function getSubjects(): Promise<UserSubject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as UserSubject[];
}

export async function addSubject(name: string, code: string, targetUnits: number): Promise<UserSubject> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase.from("subjects").select("id").eq("user_id", user.id);
  const colorIndex = (existing?.length || 0) % COLORS.length;

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      user_id: user.id,
      name,
      code,
      target_units: targetUnits,
      color: COLORS[colorIndex],
    })
    .select()
    .single();
  if (error) throw error;
  return data as UserSubject;
}

export async function updateSubject(id: string, updates: { name?: string; code?: string; target_units?: number; completed_units?: number; target_grade?: number | null }): Promise<UserSubject> {
  const { data, error } = await supabase
    .from("subjects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as UserSubject;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}
