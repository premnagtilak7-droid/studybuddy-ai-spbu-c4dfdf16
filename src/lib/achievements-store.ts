import { supabase } from "@/integrations/supabase/client";

export type BadgeKey =
  | "first_subject"
  | "streak_7"
  | "syllabus_50"
  | "all_exams_set"
  | "pomodoro_10";

export interface BadgeDef {
  key: BadgeKey;
  label: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDef[] = [
  { key: "first_subject", label: "First Steps", description: "Added your first subject", emoji: "📘" },
  { key: "streak_7", label: "On Fire", description: "Maintained a 7-day study streak", emoji: "🔥" },
  { key: "syllabus_50", label: "Halfway There", description: "Completed 50% of your syllabus", emoji: "🎯" },
  { key: "all_exams_set", label: "Prepared", description: "Set all your exam dates", emoji: "📅" },
  { key: "pomodoro_10", label: "Pomodoro Pro", description: "Completed 10 Pomodoro sessions", emoji: "🍅" },
];

export async function getUnlockedBadges(): Promise<string[]> {
  const { data } = await supabase
    .from("user_achievements")
    .select("badge_key");
  return (data || []).map((r: any) => r.badge_key);
}

export async function unlockBadge(key: BadgeKey): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("user_achievements")
    .upsert({ user_id: user.id, badge_key: key }, { onConflict: "user_id,badge_key" });

  return !error;
}

/**
 * Check all badge conditions and unlock any that are newly earned.
 * Call this on dashboard load.
 */
export async function checkAndUnlockBadges(context: {
  subjectCount: number;
  streak: number;
  syllabusPercent: number;
  examCount: number;
  subjectCount_total: number;
  pomodoroSessions: number;
}): Promise<string[]> {
  const unlocked = await getUnlockedBadges();
  const newlyUnlocked: string[] = [];

  const checks: { key: BadgeKey; condition: boolean }[] = [
    { key: "first_subject", condition: context.subjectCount >= 1 },
    { key: "streak_7", condition: context.streak >= 7 },
    { key: "syllabus_50", condition: context.syllabusPercent >= 50 },
    { key: "all_exams_set", condition: context.subjectCount_total > 0 && context.examCount >= context.subjectCount_total },
    { key: "pomodoro_10", condition: context.pomodoroSessions >= 10 },
  ];

  for (const { key, condition } of checks) {
    if (condition && !unlocked.includes(key)) {
      const success = await unlockBadge(key);
      if (success) newlyUnlocked.push(key);
    }
  }

  return newlyUnlocked;
}
