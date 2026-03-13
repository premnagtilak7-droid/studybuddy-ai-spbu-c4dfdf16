import { supabase } from "@/integrations/supabase/client";

export async function sendGroupNotification(groupId: string, userId: string, type: string, message: string) {
  await supabase.from("group_notifications").insert({ group_id: groupId, user_id: userId, type, message } as any);
}

export async function loadMemberStats(memberData: any[], userIds: string[]) {
  if (!userIds.length) return [];

  const [profilesRes, xpRes, logsRes, subjectsRes, streakRes] = await Promise.all([
    supabase.from("profiles").select("user_id, email, display_name").in("user_id", userIds),
    supabase.from("user_xp").select("user_id, total_xp").in("user_id", userIds),
    supabase.from("study_logs").select("user_id, duration_minutes, logged_at").in("user_id", userIds),
    supabase.from("subjects").select("user_id, name, code, completed_units, target_units").in("user_id", userIds),
    supabase.from("study_dates").select("user_id, study_date").in("user_id", userIds),
  ]);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return memberData.map(m => {
    const p = profilesRes.data?.find(p => p.user_id === m.user_id);
    const x = xpRes.data?.find(x => x.user_id === m.user_id);
    const userLogs = (logsRes.data || []).filter(l => l.user_id === m.user_id);
    const weeklyMins = userLogs.filter(l => new Date(l.logged_at) >= weekAgo).reduce((s, l) => s + l.duration_minutes, 0);
    const totalMins = userLogs.reduce((s, l) => s + l.duration_minutes, 0);
    const userSubjects = (subjectsRes.data || []).filter(s => s.user_id === m.user_id);

    const dates = (streakRes.data || []).filter(d => d.user_id === m.user_id).map(d => d.study_date).sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    let checkDate = dates.includes(today) ? today : dates.includes(yesterday) ? yesterday : null;
    if (checkDate) {
      for (const d of dates) {
        if (d === checkDate) { streak++; const prev = new Date(checkDate); prev.setDate(prev.getDate() - 1); checkDate = prev.toISOString().split("T")[0]; }
      }
    }

    return {
      ...m,
      email: p?.email,
      display_name: p?.display_name,
      xp: x?.total_xp || 0,
      streak,
      weekly_hours: Math.round(weeklyMins / 60 * 10) / 10,
      total_hours: Math.round(totalMins / 60 * 10) / 10,
      subjects_progress: userSubjects.map(s => ({
        name: s.name,
        code: s.code,
        progress: s.target_units > 0 ? Math.round((s.completed_units / s.target_units) * 100) : 0,
      })),
    };
  });
}
