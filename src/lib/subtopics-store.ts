import { supabase } from "@/integrations/supabase/client";

export type Subtopic = {
  id: string;
  topic_id: string;
  name: string;
  is_completed: boolean;
  difficulty: "easy" | "medium" | "hard";
  notes: string | null;
  created_at: string;
  completed_at: string | null;
};

export async function getSubtopics(topicId: string): Promise<Subtopic[]> {
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Subtopic[];
}

export async function getSubtopicsForTopics(topicIds: string[]): Promise<Subtopic[]> {
  if (topicIds.length === 0) return [];
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .in("topic_id", topicIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Subtopic[];
}

export async function addSubtopic(
  topicId: string,
  name: string,
  difficulty: "easy" | "medium" | "hard" = "medium"
): Promise<Subtopic> {
  const { data, error } = await supabase
    .from("subtopics")
    .insert({ topic_id: topicId, name, difficulty })
    .select()
    .single();
  if (error) throw error;
  return data as Subtopic;
}

export async function toggleSubtopic(id: string, isCompleted: boolean) {
  const updates: Record<string, any> = { is_completed: isCompleted };
  updates.completed_at = isCompleted ? new Date().toISOString() : null;
  const { error } = await supabase.from("subtopics").update(updates).eq("id", id);
  if (error) throw error;
}

export async function updateSubtopicNotes(id: string, notes: string) {
  const { error } = await supabase.from("subtopics").update({ notes }).eq("id", id);
  if (error) throw error;
}

export async function updateSubtopicDifficulty(id: string, difficulty: "easy" | "medium" | "hard") {
  const { error } = await supabase.from("subtopics").update({ difficulty }).eq("id", id);
  if (error) throw error;
}

export async function deleteSubtopic(id: string) {
  const { error } = await supabase.from("subtopics").delete().eq("id", id);
  if (error) throw error;
}
