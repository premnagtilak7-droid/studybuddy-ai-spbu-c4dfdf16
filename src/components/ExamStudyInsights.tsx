import { motion } from "framer-motion";
import { Clock, TrendingUp, BookOpen, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Props = {
  totalTopics: number;
  completedTopics: number;
  examDaysLeft: number | null;
  totalDaysForPrep: number;
  educationType: string;
  examName?: string;
};

export default function ExamStudyInsights({ totalTopics, completedTopics, examDaysLeft, totalDaysForPrep, educationType, examName }: Props) {
  if (!examDaysLeft || totalTopics === 0) return null;

  const syllabusPercent = Math.round((completedTopics / totalTopics) * 100);

  // Calculate ideal completion percentage based on time elapsed
  const daysElapsed = Math.max(0, totalDaysForPrep - examDaysLeft);
  const idealPercent = totalDaysForPrep > 0 ? Math.min(100, Math.round((daysElapsed / totalDaysForPrep) * 100)) : 0;
  const gap = idealPercent - syllabusPercent;
  const isAhead = syllabusPercent >= idealPercent;

  // Recommended daily study hours
  const remainingTopics = totalTopics - completedTopics;
  const topicsPerDay = examDaysLeft > 0 ? remainingTopics / examDaysLeft : remainingTopics;
  // Estimate ~30 min per topic for school, ~45 for competitive, ~40 for others
  const minPerTopic = educationType === "school" ? 30 : educationType === "competitive_exam" ? 45 : 40;
  const recommendedHoursPerDay = Math.min(12, Math.max(1, Math.round((topicsPerDay * minPerTopic) / 60 * 10) / 10));

  const urgencyLevel = examDaysLeft <= 7 ? "critical" : examDaysLeft <= 30 ? "warning" : "normal";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">
          {examName ? `${examName} Preparation` : "Exam Preparation"} Insights
        </h3>
      </div>

      {/* Recommended Daily Hours */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Study {recommendedHoursPerDay}h/day recommended
          </p>
          <p className="text-xs text-muted-foreground">
            {remainingTopics} topics remaining · {examDaysLeft} days left
          </p>
        </div>
      </div>

      {/* Syllabus Completion vs Ideal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Your Progress</span>
          <span className="font-mono font-medium text-foreground">{syllabusPercent}%</span>
        </div>
        <Progress value={syllabusPercent} className="h-2" />

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ideal Pace</span>
          <span className="font-mono font-medium text-muted-foreground">{idealPercent}%</span>
        </div>
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-muted-foreground/30 rounded-full transition-all" style={{ width: `${idealPercent}%` }} />
        </div>

        {!isAhead && gap > 5 && (
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className={`w-3.5 h-3.5 ${urgencyLevel === "critical" ? "text-destructive" : "text-accent"}`} />
            <p className={`text-xs font-medium ${urgencyLevel === "critical" ? "text-destructive" : "text-accent"}`}>
              {gap}% behind ideal pace — increase daily study hours
            </p>
          </div>
        )}
        {isAhead && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">
            ✅ You're ahead of schedule! Keep it up.
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold font-mono text-foreground">{completedTopics}</p>
          <p className="text-[10px] text-muted-foreground">Done</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold font-mono text-foreground">{remainingTopics}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold font-mono text-foreground">{Math.ceil(topicsPerDay)}</p>
          <p className="text-[10px] text-muted-foreground">Topics/Day</p>
        </div>
      </div>
    </motion.div>
  );
}
