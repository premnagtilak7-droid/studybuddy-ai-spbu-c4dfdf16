import { motion } from "framer-motion";
import { BarChart3, BookOpen, Target } from "lucide-react";
import type { UserSubject } from "@/lib/subjects-store";

interface WeeklyReportProps {
  subjects: UserSubject[];
  subjectProgress: Record<string, { total: number; done: number; unitsDone: number }>;
  syllabusPercent: number;
}

export default function WeeklyReport({ subjects, subjectProgress, syllabusPercent }: WeeklyReportProps) {
  const totalTopics = Object.values(subjectProgress).reduce((a, p) => a + p.total, 0);
  const completedTopics = Object.values(subjectProgress).reduce((a, p) => a + p.done, 0);
  const unitsCompleted = Object.values(subjectProgress).reduce((a, p) => a + p.unitsDone, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5"
    >
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        Weekly Study Report
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <Target className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold font-mono text-foreground">{syllabusPercent}%</p>
          <p className="text-[10px] text-muted-foreground font-mono">Syllabus Done</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <BookOpen className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-xl font-bold font-mono text-foreground">{completedTopics}</p>
          <p className="text-[10px] text-muted-foreground font-mono">Topics Done</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <BarChart3 className="w-5 h-5 text-chart-3 mx-auto mb-1" />
          <p className="text-xl font-bold font-mono text-foreground">{unitsCompleted}/{ subjects.length * 6}</p>
          <p className="text-[10px] text-muted-foreground font-mono">Units Done</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground font-mono mb-1">
          <span>Overall Progress</span>
          <span>{syllabusPercent}%</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full">
          <div
            className="h-full rounded-full gradient-primary transition-all duration-500"
            style={{ width: `${syllabusPercent}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
