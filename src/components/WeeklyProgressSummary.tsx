import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  BookOpen,
  Target,
  Flame,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { UserSubject } from "@/lib/subjects-store";
import { getStudyStreak } from "@/lib/study-tracker";

interface WeeklyProgressSummaryProps {
  subjects: UserSubject[];
  subjectProgress: Record<string, { total: number; done: number; unitsDone: number }>;
  syllabusPercent: number;
}

interface WeekStats {
  totalHours: number;
  topicsCompleted: number;
  daysStudied: number;
  avgHoursPerDay: number;
}

export default function WeeklyProgressSummary({
  subjects,
  subjectProgress,
  syllabusPercent,
}: WeeklyProgressSummaryProps) {
  const [thisWeek, setThisWeek] = useState<WeekStats>({ totalHours: 0, topicsCompleted: 0, daysStudied: 0, avgHoursPerDay: 0 });
  const [lastWeek, setLastWeek] = useState<WeekStats>({ totalHours: 0, topicsCompleted: 0, daysStudied: 0, avgHoursPerDay: 0 });
  const [expanded, setExpanded] = useState(false);
  const [topSubjects, setTopSubjects] = useState<{ name: string; hours: number; color: string }[]>([]);

  const streak = getStudyStreak();

  useEffect(() => {
    const fetchWeeklyData = async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      // Start of this week (Sunday)
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - dayOfWeek);
      thisWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setMilliseconds(-1);

      // Fetch study logs for both weeks
      const [thisWeekLogs, lastWeekLogs, thisWeekTopics, lastWeekTopics] = await Promise.all([
        supabase
          .from("study_logs")
          .select("logged_at, duration_minutes, subject_id")
          .gte("logged_at", thisWeekStart.toISOString()),
        supabase
          .from("study_logs")
          .select("logged_at, duration_minutes")
          .gte("logged_at", lastWeekStart.toISOString())
          .lte("logged_at", lastWeekEnd.toISOString()),
        supabase
          .from("topics")
          .select("completed_at")
          .eq("is_completed", true)
          .gte("completed_at", thisWeekStart.toISOString()),
        supabase
          .from("topics")
          .select("completed_at")
          .eq("is_completed", true)
          .gte("completed_at", lastWeekStart.toISOString())
          .lte("completed_at", lastWeekEnd.toISOString()),
      ]);

      const twLogs = thisWeekLogs.data || [];
      const lwLogs = lastWeekLogs.data || [];
      const twTopics = thisWeekTopics.data || [];
      const lwTopics = lastWeekTopics.data || [];

      const twTotalMins = twLogs.reduce((s, l) => s + (l.duration_minutes || 0), 0);
      const lwTotalMins = lwLogs.reduce((s, l) => s + (l.duration_minutes || 0), 0);

      const twDays = new Set(twLogs.map((l) => l.logged_at.slice(0, 10))).size;
      const lwDays = new Set(lwLogs.map((l) => l.logged_at.slice(0, 10))).size;

      setThisWeek({
        totalHours: +(twTotalMins / 60).toFixed(1),
        topicsCompleted: twTopics.length,
        daysStudied: twDays,
        avgHoursPerDay: twDays > 0 ? +(twTotalMins / 60 / twDays).toFixed(1) : 0,
      });

      setLastWeek({
        totalHours: +(lwTotalMins / 60).toFixed(1),
        topicsCompleted: lwTopics.length,
        daysStudied: lwDays,
        avgHoursPerDay: lwDays > 0 ? +(lwTotalMins / 60 / lwDays).toFixed(1) : 0,
      });

      // Top subjects by hours this week
      const subjectMap = new Map(subjects.map((s) => [s.id, s]));
      const subjectHours: Record<string, number> = {};
      for (const log of twLogs) {
        if (log.subject_id) {
          subjectHours[log.subject_id] = (subjectHours[log.subject_id] || 0) + (log.duration_minutes || 0);
        }
      }
      const sorted = Object.entries(subjectHours)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, mins]) => ({
          name: subjectMap.get(id)?.name || "Unknown",
          hours: +(mins / 60).toFixed(1),
          color: subjectMap.get(id)?.color || "chart-1",
        }));
      setTopSubjects(sorted);
    };

    fetchWeeklyData();
  }, [subjects]);

  const totalTopics = Object.values(subjectProgress).reduce((a, p) => a + p.total, 0);
  const completedTopics = Object.values(subjectProgress).reduce((a, p) => a + p.done, 0);
  const unitsCompleted = Object.values(subjectProgress).reduce((a, p) => a + p.unitsDone, 0);

  const hoursDiff = thisWeek.totalHours - lastWeek.totalHours;
  const topicsDiff = thisWeek.topicsCompleted - lastWeek.topicsCompleted;

  const TrendIcon = ({ diff }: { diff: number }) => {
    if (diff > 0) return <TrendingUp className="w-3.5 h-3.5 text-[hsl(var(--success))]" />;
    if (diff < 0) return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const trendColor = (diff: number) =>
    diff > 0 ? "text-[hsl(var(--success))]" : diff < 0 ? "text-destructive" : "text-muted-foreground";

  const isSunday = new Date().getDay() === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
      {/* Sunday highlight banner */}
      {isSunday && (
        <div className="px-5 py-2.5 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Weekly Progress Summary — Here's how your week went!</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Weekly Progress
          </h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {expanded ? "Less" : "Details"}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Main stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Clock className="w-4 h-4 text-primary" />}
            label="Hours Studied"
            value={`${thisWeek.totalHours}h`}
            trend={<><TrendIcon diff={hoursDiff} /><span className={`text-[10px] font-mono ${trendColor(hoursDiff)}`}>{hoursDiff > 0 ? "+" : ""}{hoursDiff.toFixed(1)}h</span></>}
          />
          <StatCard
            icon={<BookOpen className="w-4 h-4 text-accent" />}
            label="Topics Done"
            value={String(thisWeek.topicsCompleted)}
            trend={<><TrendIcon diff={topicsDiff} /><span className={`text-[10px] font-mono ${trendColor(topicsDiff)}`}>{topicsDiff > 0 ? "+" : ""}{topicsDiff}</span></>}
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-[hsl(var(--success))]" />}
            label="Syllabus"
            value={`${syllabusPercent}%`}
            trend={<span className="text-[10px] font-mono text-muted-foreground">{completedTopics}/{totalTopics}</span>}
          />
          <StatCard
            icon={<Flame className="w-4 h-4 text-accent" />}
            label="Streak"
            value={`${streak}d`}
            trend={<span className="text-[10px] font-mono text-muted-foreground">{streak > 0 ? "🔥 Keep going!" : "Start today"}</span>}
          />
        </div>

        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground font-mono mb-1">
            <span>Overall Progress</span>
            <span>{unitsCompleted}/{subjects.length * 6} units</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${syllabusPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                {/* Week comparison */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Week Comparison</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-[10px] font-mono text-muted-foreground mb-1">This Week</p>
                      <p className="text-sm font-bold font-mono text-foreground">{thisWeek.totalHours}h</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {thisWeek.daysStudied} days · {thisWeek.avgHoursPerDay}h/day avg
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-[10px] font-mono text-muted-foreground mb-1">Last Week</p>
                      <p className="text-sm font-bold font-mono text-foreground">{lastWeek.totalHours}h</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {lastWeek.daysStudied} days · {lastWeek.avgHoursPerDay}h/day avg
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top subjects */}
                {topSubjects.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Top Subjects This Week</p>
                    <div className="space-y-2">
                      {topSubjects.map((s, i) => (
                        <div key={s.name} className="flex items-center gap-3">
                          <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                          </div>
                          <span className="text-xs font-mono font-semibold text-foreground">{s.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject breakdown */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Subject Breakdown</p>
                  <div className="space-y-2">
                    {subjects.map((s) => {
                      const prog = subjectProgress[s.id] || { total: 0, done: 0, unitsDone: 0 };
                      const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                      const barColor =
                        pct >= 71
                          ? "bg-[hsl(var(--success))]"
                          : pct >= 31
                          ? "bg-accent"
                          : "bg-destructive";
                      return (
                        <div key={s.id}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] font-medium text-foreground truncate max-w-[60%]">{s.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {prog.done}/{prog.total} · {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-xl bg-secondary/50">
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] font-mono text-muted-foreground">{label}</span></div>
      <p className="text-xl font-bold font-mono text-foreground">{value}</p>
      <div className="flex items-center gap-1 mt-0.5">{trend}</div>
    </div>
  );
}
