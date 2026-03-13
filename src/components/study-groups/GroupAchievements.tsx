import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GroupAchievement, MemberWithStats } from "./types";
import { GROUP_BADGES } from "./types";

interface Props {
  groupId: string;
  members: MemberWithStats[];
}

export default function GroupAchievements({ groupId, members }: Props) {
  const [achievements, setAchievements] = useState<GroupAchievement[]>([]);

  useEffect(() => { loadAndCheck(); }, [groupId, members]);

  async function loadAndCheck() {
    const { data } = await supabase.from("group_achievements").select("*").eq("group_id", groupId);
    const existing = (data || []) as GroupAchievement[];
    setAchievements(existing);

    const totalHours = members.reduce((s, m) => s + (m.total_hours || 0), 0);
    const memberCount = members.length;
    const allActive = members.length > 0 && members.every(m => (m.weekly_hours || 0) > 0);

    const toUnlock: string[] = [];
    const unlockedKeys = existing.map(a => a.badge_key);

    GROUP_BADGES.forEach(b => {
      if (unlockedKeys.includes(b.key)) return;
      if (b.key === "group_10h" && totalHours >= 10) toUnlock.push(b.key);
      if (b.key === "group_50h" && totalHours >= 50) toUnlock.push(b.key);
      if (b.key === "group_100h" && totalHours >= 100) toUnlock.push(b.key);
      if (b.key === "group_5_members" && memberCount >= 5) toUnlock.push(b.key);
      if (b.key === "group_all_active" && allActive) toUnlock.push(b.key);
    });

    for (const key of toUnlock) {
      await supabase.from("group_achievements").insert({ group_id: groupId, badge_key: key } as any);
      const badge = GROUP_BADGES.find(b => b.key === key);
      if (badge) toast.success(`🏆 Group Achievement: ${badge.label}`);
    }
    if (toUnlock.length) {
      const { data: fresh } = await supabase.from("group_achievements").select("*").eq("group_id", groupId);
      setAchievements((fresh || []) as GroupAchievement[]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <p className="text-sm font-medium text-foreground">Group Achievements</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GROUP_BADGES.map(b => {
          const unlocked = achievements.some(a => a.badge_key === b.key);
          return (
            <div key={b.key} className={`p-3 rounded-lg border ${unlocked ? "bg-yellow-500/10 border-yellow-500/30" : "bg-secondary/20 border-border opacity-50"}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{b.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{b.label}</p>
                  <p className="text-[10px] text-muted-foreground">{b.description}</p>
                </div>
                {unlocked && <Badge className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">Unlocked</Badge>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
