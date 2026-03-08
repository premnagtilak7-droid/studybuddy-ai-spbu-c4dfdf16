import { supabase } from "@/integrations/supabase/client";

export type BadgeKey =
  | "first_subject"
  | "streak_7"
  | "streak_30"
  | "syllabus_50"
  | "syllabus_100"
  | "all_exams_set"
  | "pomodoro_10"
  | "question_king"
  | "planner_pro"
  | "test_champion"
  | "night_owl"
  | "early_bird";

export interface BadgeDef {
  key: BadgeKey;
  label: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDef[] = [
  { key: "first_subject", label: "First Step", description: "Added your first subject", emoji: "📘" },
  { key: "streak_7", label: "Week Warrior", description: "Maintained a 7-day study streak", emoji: "🔥" },
  { key: "streak_30", label: "Month Master", description: "Maintained a 30-day study streak", emoji: "💪" },
  { key: "syllabus_50", label: "Half Way", description: "Completed 50% of your syllabus", emoji: "🎯" },
  { key: "syllabus_100", label: "Completionist", description: "Completed 100% of your syllabus", emoji: "🏅" },
  { key: "all_exams_set", label: "Prepared", description: "Set all your exam dates", emoji: "📅" },
  { key: "pomodoro_10", label: "Pomodoro Pro", description: "Completed 10 Pomodoro sessions", emoji: "🍅" },
  { key: "question_king", label: "Question King", description: "Asked 50 AI doubts", emoji: "👑" },
  { key: "planner_pro", label: "Planner Pro", description: "Generated 5 study plans", emoji: "📋" },
  { key: "test_champion", label: "Test Champion", description: "Completed 10 mock tests", emoji: "🏆" },
  { key: "night_owl", label: "Night Owl", description: "Studied after 11 PM", emoji: "🦉" },
  { key: "early_bird", label: "Early Bird", description: "Studied before 7 AM", emoji: "🐦" },
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

export async function checkAndUnlockBadges(context: {
  subjectCount: number;
  streak: number;
  syllabusPercent: number;
  examCount: number;
  subjectCount_total: number;
  pomodoroSessions: number;
  doubtsAsked?: number;
  studyPlans?: number;
  mockTests?: number;
  currentHour?: number;
}): Promise<string[]> {
  const unlocked = await getUnlockedBadges();
  const newlyUnlocked: string[] = [];

  const hour = context.currentHour ?? new Date().getHours();

  const checks: { key: BadgeKey; condition: boolean }[] = [
    { key: "first_subject", condition: context.subjectCount >= 1 },
    { key: "streak_7", condition: context.streak >= 7 },
    { key: "streak_30", condition: context.streak >= 30 },
    { key: "syllabus_50", condition: context.syllabusPercent >= 50 },
    { key: "syllabus_100", condition: context.syllabusPercent >= 100 },
    { key: "all_exams_set", condition: context.subjectCount_total > 0 && context.examCount >= context.subjectCount_total },
    { key: "pomodoro_10", condition: context.pomodoroSessions >= 10 },
    { key: "question_king", condition: (context.doubtsAsked ?? 0) >= 50 },
    { key: "planner_pro", condition: (context.studyPlans ?? 0) >= 5 },
    { key: "test_champion", condition: (context.mockTests ?? 0) >= 10 },
    { key: "night_owl", condition: hour >= 23 || hour < 4 },
    { key: "early_bird", condition: hour >= 4 && hour < 7 },
  ];

  for (const { key, condition } of checks) {
    if (condition && !unlocked.includes(key)) {
      const success = await unlockBadge(key);
      if (success) newlyUnlocked.push(key);
    }
  }

  return newlyUnlocked;
}
