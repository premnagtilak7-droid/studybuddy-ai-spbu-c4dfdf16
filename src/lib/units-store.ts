import { supabase } from "@/integrations/supabase/client";

export type Unit = {
  id: string;
  subject_id: string;
  unit_number: number;
  name: string;
  created_at: string;
  topics?: Topic[];
};

export type Topic = {
  id: string;
  unit_id: string;
  name: string;
  is_completed: boolean;
  priority: "high" | "medium" | "low";
  created_at: string;
};

export async function getUnitsWithTopics(subjectId: string): Promise<Unit[]> {
  const { data: units, error } = await supabase
    .from("units")
    .select("*")
    .eq("subject_id", subjectId)
    .order("unit_number", { ascending: true });
  if (error) throw error;

  const unitIds = (units || []).map((u: any) => u.id);
  if (unitIds.length === 0) return (units || []) as Unit[];

  const { data: topics, error: tErr } = await supabase
    .from("topics")
    .select("*")
    .in("unit_id", unitIds)
    .order("created_at", { ascending: true });
  if (tErr) throw tErr;

  return (units || []).map((u: any) => ({
    ...u,
    topics: (topics || []).filter((t: any) => t.unit_id === u.id),
  })) as Unit[];
}

export async function updateUnitName(id: string, name: string) {
  const { error } = await supabase.from("units").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function addTopic(unitId: string, name: string, priority: "high" | "medium" | "low" = "medium") {
  const { data, error } = await supabase
    .from("topics")
    .insert({ unit_id: unitId, name, priority })
    .select()
    .single();
  if (error) throw error;
  return data as Topic;
}

export async function toggleTopic(id: string, isCompleted: boolean) {
  const { error } = await supabase.from("topics").update({ is_completed: isCompleted }).eq("id", id);
  if (error) throw error;
}

export async function updateTopicPriority(id: string, priority: "high" | "medium" | "low") {
  const { error } = await supabase.from("topics").update({ priority }).eq("id", id);
  if (error) throw error;
}

export async function deleteTopic(id: string) {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}
