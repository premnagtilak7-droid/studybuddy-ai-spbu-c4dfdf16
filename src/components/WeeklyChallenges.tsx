import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Challenge {
  id: string;
  title: string;
  description: string;
  target_value: number;
  challenge_type: string;
  bonus_xp: number;
  week_start: string;
}

interface ChallengeWithProgress extends Challenge {
  current_value: number;
  completed: boolean;
}

export default function WeeklyChallenges() {
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, []);

  async function loadChallenges() {
    // Get current week's Monday
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const weekStart = monday.toISOString().split("T")[0];

    const { data: challData } = await supabase
      .from("weekly_challenges")
      .select("*")
      .eq("week_start", weekStart);

    if (!challData || challData.length === 0) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: progressData } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("challenge_id", challData.map((c) => c.id));

    const merged: ChallengeWithProgress[] = challData.map((c) => {
      const prog = progressData?.find((p) => p.challenge_id === c.id);
      return {
        ...c,
        current_value: prog?.current_value ?? 0,
        completed: prog?.completed ?? false,
      };
    });

    setChallenges(merged);
    setLoading(false);
  }

  if (loading || challenges.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-primary" />
        Weekly Challenges
      </h3>
      <div className="space-y-3">
        {challenges.map((c) => {
          const pct = Math.min(100, Math.round((c.current_value / c.target_value) * 100));
          return (
            <div
              key={c.id}
              className={`p-3 rounded-lg border ${c.completed ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-transparent"}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">{c.description}</p>
                </div>
                <span className="text-xs font-mono text-primary flex items-center gap-1">
                  <Zap className="w-3 h-3" />+{c.bonus_xp} XP
                </span>
              </div>
              <Progress value={pct} className="h-1.5 mt-2" />
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                {c.current_value}/{c.target_value} {c.completed ? "✅ Complete!" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
