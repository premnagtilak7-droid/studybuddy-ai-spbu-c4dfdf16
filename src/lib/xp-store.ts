import { supabase } from "@/integrations/supabase/client";

export type XPReason =
  | "topic_complete"
  | "daily_login"
  | "streak_bonus"
  | "mock_test"
  | "ai_doubt"
  | "study_plan";

const XP_AMOUNTS: Record<XPReason, number> = {
  topic_complete: 10,
  daily_login: 5,
  streak_bonus: 15,
  mock_test: 20,
  ai_doubt: 5,
  study_plan: 10,
};

export interface LevelDef {
  name: string;
  emoji: string;
  minXP: number;
  maxXP: number;
}

export const LEVELS: LevelDef[] = [
  { name: "Fresher", emoji: "📚", minXP: 0, maxXP: 100 },
  { name: "Scholar", emoji: "🎓", minXP: 101, maxXP: 500 },
  { name: "Achiever", emoji: "⭐", minXP: 501, maxXP: 1000 },
  { name: "Topper", emoji: "🏆", minXP: 1001, maxXP: 2500 },
  { name: "Legend", emoji: "👑", minXP: 2501, maxXP: Infinity },
];

export function getLevel(xp: number): LevelDef {
  return LEVELS.find((l) => xp >= l.minXP && xp <= l.maxXP) || LEVELS[0];
}

export function getNextLevel(xp: number): LevelDef | null {
  const idx = LEVELS.findIndex((l) => xp >= l.minXP && xp <= l.maxXP);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export function getLevelProgress(xp: number): number {
  const level = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  const range = next.minXP - level.minXP;
  const progress = xp - level.minXP;
  return Math.min(100, Math.round((progress / range) * 100));
}

export async function getUserXP(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("user_xp")
    .select("total_xp")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.total_xp ?? 0;
}

export async function awardXP(reason: XPReason, customAmount?: number): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const amount = customAmount ?? XP_AMOUNTS[reason];

  // Check for duplicate daily_login today
  if (reason === "daily_login") {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("xp_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("reason", "daily_login")
      .gte("created_at", today + "T00:00:00Z")
      .limit(1);
    if (existing && existing.length > 0) return 0;
  }

  // Log XP
  await supabase.from("xp_logs").insert({
    user_id: user.id,
    amount,
    reason,
  });

  // Upsert total
  const currentXP = await getUserXP();
  const newTotal = currentXP + amount;
  await supabase
    .from("user_xp")
    .upsert({ user_id: user.id, total_xp: newTotal, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  return amount;
}

export async function getLeaderboard(type: "xp" | "streak" | "topics", period: "weekly" | "alltime") {
  if (type === "xp") {
    const { data } = await supabase
      .from("user_xp")
      .select("user_id, total_xp")
      .order("total_xp", { ascending: false })
      .limit(10);

    if (!data) return [];

    // Get display names
    const userIds = data.map((d) => d.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", userIds);

    return data.map((d) => {
      const profile = profiles?.find((p) => p.user_id === d.user_id);
      return {
        user_id: d.user_id,
        display_name: profile?.display_name || profile?.email?.split("@")[0] || "Anonymous",
        value: d.total_xp,
      };
    });
  }
  return [];
}
