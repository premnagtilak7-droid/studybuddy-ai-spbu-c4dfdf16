import { supabase } from "@/integrations/supabase/client";

export type DoubtEntry = {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  image_url: string | null;
  subject_id: string | null;
  created_at: string;
};

export async function saveDoubt(question: string, answer: string, imageUrl?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const { error } = await supabase.from("doubt_history").insert({
    user_id: user.id,
    question,
    answer,
    image_url: imageUrl || null,
  });
  if (error) console.error("Failed to save doubt:", error);
}

export async function getDoubts(): Promise<DoubtEntry[]> {
  const { data, error } = await supabase
    .from("doubt_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as DoubtEntry[];
}

export async function deleteDoubt(id: string): Promise<void> {
  const { error } = await supabase.from("doubt_history").delete().eq("id", id);
  if (error) throw error;
}
