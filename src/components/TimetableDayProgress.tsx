import { motion } from "framer-motion";
import { CalendarClock, Clock, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getTodayTimetableProgress } from "@/lib/timetable-helpers";

export default function TimetableDayProgress() {
  const { totalSessions, completedSessions, totalHours, completedHours } = getTodayTimetableProgress();

  if (totalSessions === 0) return null;

  const pct = Math.round((completedHours / totalHours) * 100) || 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          Today's Timetable
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {completedSessions}/{totalSessions} sessions
        </span>
      </div>
      <div className="space-y-2">
        <Progress value={pct} className="h-3" />
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {completedHours.toFixed(1)}h / {totalHours.toFixed(1)}h completed
          </p>
          <p className={`text-xs font-bold font-mono ${pct >= 100 ? "text-primary" : "text-muted-foreground"}`}>
            {pct >= 100 ? (
              <span className="flex items-center gap-1"><Check className="w-3 h-3" /> All done! 🎉</span>
            ) : (
              `${(totalHours - completedHours).toFixed(1)}h remaining`
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
