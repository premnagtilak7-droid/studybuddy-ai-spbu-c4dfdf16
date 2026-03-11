import { supabase } from "@/integrations/supabase/client";

const LAST_STUDIED_KEY = "sppu_last_studied";

// Record a study session date to Supabase
export async function recordStudySession() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const today = new Date().toISOString().split("T")[0];
  await supabase
    .from("study_dates")
    .upsert({ user_id: user.id, study_date: today }, { onConflict: "user_id,study_date" })
    .then(() => {});
  
  // Also keep localStorage as fallback
  const dates = getStudyDatesLocal();
  if (!dates.includes(today)) {
    dates.push(today);
    localStorage.setItem("sppu_study_dates", JSON.stringify(dates));
  }
}

function getStudyDatesLocal(): string[] {
  try {
    return JSON.parse(localStorage.getItem("sppu_study_dates") || "[]");
  } catch { return []; }
}

export async function getStudyDatesFromDB(): Promise<string[]> {
  const { data } = await supabase
    .from("study_dates")
    .select("study_date")
    .order("study_date", { ascending: true });
  return (data || []).map((d: any) => d.study_date);
}

// Synchronous for components that need it immediately
export function getStudyDates(): string[] {
  return getStudyDatesLocal();
}

export function getStudyStreak(): number {
  const dates = getStudyDatesLocal().sort().reverse();
  if (dates.length === 0) return 0;
  
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let checkDate = new Date(today);
  
  if (dates[0] !== today) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (dates[0] !== checkDate.toISOString().split("T")[0]) return 0;
  }
  
  for (const d of dates) {
    const expected = checkDate.toISOString().split("T")[0];
    if (d === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}

export async function getStudyStreakFromDB(): Promise<number> {
  const dates = (await getStudyDatesFromDB()).sort().reverse();
  if (dates.length === 0) return 0;
  
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let checkDate = new Date(today + "T00:00:00");
  
  if (dates[0] !== today) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (dates[0] !== checkDate.toISOString().split("T")[0]) return 0;
  }
  
  for (const d of dates) {
    const expected = checkDate.toISOString().split("T")[0];
    if (d === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}

// Sync DB dates to localStorage on load
export async function syncStudyDates() {
  const dbDates = await getStudyDatesFromDB();
  const localDates = getStudyDatesLocal();
  const merged = [...new Set([...dbDates, ...localDates])].sort();
  localStorage.setItem("sppu_study_dates", JSON.stringify(merged));
  
  // Upload any local-only dates to DB
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const dbSet = new Set(dbDates);
  const localOnly = localDates.filter(d => !dbSet.has(d));
  if (localOnly.length > 0) {
    await supabase.from("study_dates").upsert(
      localOnly.map(d => ({ user_id: user.id, study_date: d })),
      { onConflict: "user_id,study_date" }
    );
  }
}

export type LastStudied = {
  subjectId: string;
  subjectName: string;
  topicName: string;
  unitName: string;
  timestamp: number;
};

export function setLastStudied(info: LastStudied) {
  localStorage.setItem(LAST_STUDIED_KEY, JSON.stringify(info));
}

export function getLastStudied(): LastStudied | null {
  try {
    const raw = localStorage.getItem(LAST_STUDIED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
