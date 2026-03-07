import { supabase } from "@/integrations/supabase/client";

export type ExamDate = {
  id: string;
  subject_id: string | null;
  user_id: string | null;
  exam_date: string;
  is_global: boolean;
  label: string;
  created_at: string;
};

export async function getExamDates(): Promise<ExamDate[]> {
  const { data, error } = await supabase
    .from("exam_dates")
    .select("*")
    .order("exam_date", { ascending: true });
  if (error) throw error;
  return (data || []) as ExamDate[];
}

export async function addExamDate(examDate: string, label: string, subjectId?: string, isGlobal = false): Promise<ExamDate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("exam_dates")
    .insert({
      user_id: user.id,
      exam_date: examDate,
      label,
      subject_id: subjectId || null,
      is_global: isGlobal,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ExamDate;
}

export async function deleteExamDate(id: string): Promise<void> {
  const { error } = await supabase.from("exam_dates").delete().eq("id", id);
  if (error) throw error;
}

export function getNextExam(exams: ExamDate[]): { exam: ExamDate; daysLeft: number } | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  for (const exam of exams) {
    const examDay = new Date(exam.exam_date);
    examDay.setHours(0, 0, 0, 0);
    const diff = Math.ceil((examDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0) return { exam, daysLeft: diff };
  }
  return null;
}
