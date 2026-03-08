import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";

interface ExamCountdownProps {
  exam?: { label: string | null; exam_date: string } | null;
  daysLeft?: number;
}

function useLiveCountdown(examDate?: string) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!examDate) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [examDate]);

  if (!examDate) return null;

  const target = new Date(examDate).setHours(0, 0, 0, 0);
  const diff = Math.max(0, target - now);
  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

export default function ExamCountdown({ exam, daysLeft }: ExamCountdownProps) {
  const countdown = useLiveCountdown(exam?.exam_date);

  // No exam set
  if (!exam || !countdown) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">No Exam Scheduled</h3>
            <Link to="/exam-dates" className="text-xs text-primary font-medium hover:underline">
              Set your exam date →
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  const isUrgent = (daysLeft ?? countdown.days) <= 7;

  const timeBlocks = [
    { value: countdown.days, label: "Days" },
    { value: countdown.hours, label: "Hours" },
    { value: countdown.minutes, label: "Min" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-5 ${isUrgent ? "ring-2 ring-destructive/40" : ""}`}
    >
      <div className="flex items-center gap-3 mb-4">
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
          <h3 className="font-semibold text-foreground text-sm">{exam.label || "Upcoming Exam"}</h3>
          <p className="text-xs text-muted-foreground font-mono">{exam.exam_date}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        {timeBlocks.map((block) => (
          <div key={block.label} className="flex flex-col items-center">
            <span className={`text-3xl font-bold font-mono leading-none ${isUrgent ? "text-destructive" : "text-foreground"}`}>
              {String(block.value).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground mt-1">{block.label}</span>
          </div>
        ))}
      </div>

      {isUrgent && (
        <div className="mt-4 pt-3 border-t border-destructive/20">
          <p className="text-xs text-destructive font-medium">
            ⚡ Focus on High-weightage topics first. Use AI Solver for quick doubt clearing.
          </p>
        </div>
      )}
    </motion.div>
  );
}
