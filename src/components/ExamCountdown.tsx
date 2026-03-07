import { motion } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";

interface ExamCountdownProps {
  exam: { label: string; exam_date: string };
  daysLeft: number;
}

export default function ExamCountdown({ exam, daysLeft }: ExamCountdownProps) {
  const isUrgent = daysLeft <= 7;
  const hours = daysLeft * 24;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 ${isUrgent ? "ring-2 ring-destructive/40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isUrgent ? (
            <div className="w-10 h-10 rounded-lg bg-destructive flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary-foreground" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground text-sm">{exam.label}</h3>
            <p className="text-xs text-muted-foreground font-mono">{exam.exam_date}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold font-mono ${isUrgent ? "text-destructive" : "text-foreground"}`}>
            {daysLeft}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">days left</p>
        </div>
      </div>
      {isUrgent && (
        <div className="mt-3 pt-3 border-t border-destructive/20">
          <p className="text-xs text-destructive font-medium">
            ⚡ Focus on High-weightage topics first. Use AI Solver for quick doubt clearing.
          </p>
        </div>
      )}
    </motion.div>
  );
}
