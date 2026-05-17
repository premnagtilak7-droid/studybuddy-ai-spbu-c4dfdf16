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
  completed_at: string | null;
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

export async function addUnit(subjectId: string, name: string, topicNames: string[] = []) {
  const { data: existing, error: e1 } = await supabase
    .from("units")
    .select("unit_number")
    .eq("subject_id", subjectId)
    .order("unit_number", { ascending: false })
    .limit(1);
  if (e1) throw e1;
  const nextNumber = (existing?.[0]?.unit_number ?? 0) + 1;
  if (nextNumber > 30) throw new Error("Max 30 units per subject");
  const { data: unit, error } = await supabase
    .from("units")
    .insert({ subject_id: subjectId, unit_number: nextNumber, name })
    .select()
    .single();
  if (error) throw error;
  const cleanTopics = topicNames.map((t) => t.trim()).filter(Boolean);
  if (cleanTopics.length > 0) {
    const { error: tErr } = await supabase
      .from("topics")
      .insert(cleanTopics.map((name) => ({ unit_id: (unit as any).id, name, priority: "medium" as const })));
    if (tErr) throw tErr;
  }
  return unit as Unit;
}

export async function deleteUnit(id: string) {
  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderUnits(subjectId: string, orderedIds: string[]) {
  // Two-phase swap to avoid unique (subject_id, unit_number) collisions.
  for (let i = 0; i < orderedIds.length; i++) {
    const tempNumber = 1000 + i; // safe temp range
    const { error } = await supabase
      .from("units")
      .update({ unit_number: tempNumber })
      .eq("id", orderedIds[i])
      .eq("subject_id", subjectId);
    if (error) throw error;
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("units")
      .update({ unit_number: i + 1 })
      .eq("id", orderedIds[i])
      .eq("subject_id", subjectId);
    if (error) throw error;
  }
}

export async function seedUnitsForSubject(
  subjectId: string,
  presetUnits: Array<{ name: string; topics: Array<{ name: string; priority?: "high" | "medium" | "low" }> }>,
) {
  if (presetUnits.length === 0) return;
  // Remove existing auto-created placeholder units so we don't end up with "Unit 1" + real Unit 1.
  await supabase.from("units").delete().eq("subject_id", subjectId);
  const unitRows = presetUnits.map((u, idx) => ({
    subject_id: subjectId,
    unit_number: idx + 1,
    name: u.name,
  }));
  const { data: inserted, error } = await supabase.from("units").insert(unitRows).select();
  if (error) throw error;
  const topicRows: any[] = [];
  (inserted || []).forEach((unitRow: any, idx: number) => {
    const preset = presetUnits[idx];
    preset.topics.forEach((t) => {
      topicRows.push({ unit_id: unitRow.id, name: t.name, priority: t.priority || "medium" });
    });
  });
  if (topicRows.length > 0) {
    const { error: tErr } = await supabase.from("topics").insert(topicRows);
    if (tErr) throw tErr;
  }
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
  const updates: Record<string, any> = { is_completed: isCompleted };
  if (isCompleted) {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }
  const { error } = await supabase.from("topics").update(updates).eq("id", id);
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

