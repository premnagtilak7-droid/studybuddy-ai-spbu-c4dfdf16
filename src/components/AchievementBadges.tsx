import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { BADGES, getUnlockedBadges, checkAndUnlockBadges } from "@/lib/achievements-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface AchievementBadgesProps {
  subjectCount: number;
  streak: number;
  syllabusPercent: number;
  examCount: number;
  pomodoroSessions: number;
}

export default function AchievementBadges({
  subjectCount,
  streak,
  syllabusPercent,
  examCount,
  pomodoroSessions,
}: AchievementBadgesProps) {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getUnlockedBadges().then((keys) => setUnlocked(new Set(keys)));
  }, []);

  // Check for new badges when context changes
  useEffect(() => {
    if (checked) return;
    if (subjectCount === undefined) return;

    checkAndUnlockBadges({
      subjectCount,
      streak,
      syllabusPercent,
      examCount,
      subjectCount_total: subjectCount,
      pomodoroSessions,
    }).then((newBadges) => {
      if (newBadges.length > 0) {
        setUnlocked((prev) => {
          const next = new Set(prev);
          newBadges.forEach((k) => next.add(k));
          return next;
        });
        const badge = BADGES.find((b) => b.key === newBadges[0]);
        if (badge) {
          toast({
            title: `${badge.emoji} Badge Unlocked!`,
            description: badge.label + " — " + badge.description,
          });
        }
      }
      setChecked(true);
    });
  }, [subjectCount, streak, syllabusPercent, examCount, pomodoroSessions, checked, toast]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
        <Award className="w-4 h-4 text-primary" />
        Achievement Badges
      </h3>

      <div className="grid grid-cols-5 gap-3">
        {BADGES.map((badge) => {
          const isUnlocked = unlocked.has(badge.key);
          return (
            <Tooltip key={badge.key}>
              <TooltipTrigger asChild>
                <div
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                    isUnlocked
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "bg-secondary/50 opacity-40 grayscale"
                  }`}
                >
                  <span className="text-2xl">{badge.emoji}</span>
                  <span className="text-[10px] font-mono text-center text-foreground leading-tight">
                    {badge.label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{badge.label}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
                {isUnlocked && <p className="text-xs text-primary mt-1">✓ Unlocked</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </motion.div>
  );
}
