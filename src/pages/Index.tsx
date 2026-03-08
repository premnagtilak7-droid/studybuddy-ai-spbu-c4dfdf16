import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, BookOpen, Target, TrendingUp, Plus, AlertTriangle, CalendarClock, PlayCircle, Search, Info } from "lucide-react";
import StudyHeatmap from "../components/StudyHeatmap";
import SubjectChart from "../components/SubjectChart";
import ExamCountdown from "../components/ExamCountdown";
import WeeklyReport from "../components/WeeklyReport";
import AppLayout from "../components/AppLayout";
import CircularProgress from "../components/CircularProgress";
import DashboardSearch from "../components/DashboardSearch";
import OnboardingWizard from "../components/OnboardingWizard";
import QuickExamModal from "../components/QuickExamModal";
import DailyStudyGoal from "../components/DailyStudyGoal";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getExamDates, getNextExam, type ExamDate } from "@/lib/exam-store";
import { getUnitsWithTopics, type Unit } from "@/lib/units-store";
import { getLastStudied, getStudyStreak } from "@/lib/study-tracker";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [examDates, setExamDates] = useState<ExamDate[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<Record<string, { total: number; done: number; unitsDone: number }>>({});
  const [allUnits, setAllUnits] = useState<Record<string, Unit[]>>({});
  const [examModalOpen, setExamModalOpen] = useState(false);

  const lastStudied = getLastStudied();
  const streak = getStudyStreak();

  useEffect(() => {
    Promise.all([
      getSubjects(),
      getExamDates(),
    ]).then(async ([subs, exams]) => {
      setSubjects(subs);
      setExamDates(exams);

      const progress: Record<string, { total: number; done: number; unitsDone: number }> = {};
      const unitsMap: Record<string, Unit[]> = {};
      await Promise.all(
        subs.map(async (s) => {
          try {
            const units = await getUnitsWithTopics(s.id);
            unitsMap[s.id] = units;
            const total = units.reduce((a, u) => a + (u.topics?.length || 0), 0);
            const done = units.reduce((a, u) => a + (u.topics?.filter(t => t.is_completed).length || 0), 0);
            const unitsDone = units.filter(u => {
              const topics = u.topics || [];
              return topics.length > 0 && topics.every(t => t.is_completed);
            }).length;
            progress[s.id] = { total, done, unitsDone };
          } catch { progress[s.id] = { total: 0, done: 0, unitsDone: 0 }; }
        })
      );
      setSubjectProgress(progress);
      setAllUnits(unitsMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const nextExam = getNextExam(examDates);
  const isRevisionMode = nextExam && nextExam.daysLeft <= 7;

  const totalTopics = Object.values(subjectProgress).reduce((a, p) => a + p.total, 0);
  const completedTopics = Object.values(subjectProgress).reduce((a, p) => a + p.done, 0);
  const syllabusPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Goal warning: check if any subject with target_grade has low progress vs days left
  const goalWarnings = subjects.filter(s => {
    if (!s.target_grade || !nextExam) return false;
    const prog = subjectProgress[s.id];
    if (!prog || prog.total === 0) return false;
    const progressPct = (prog.done / prog.total) * 100;
    // Warn if progress% is less than (100 - daysLeft) — i.e. behind schedule
    const expectedPct = Math.max(0, 100 - nextExam.daysLeft * 2);
    return progressPct < expectedPct;
  });

  const statCards = [
    { label: "Syllabus Done", value: `${syllabusPercent}%`, icon: Target, change: `${completedTopics}/${totalTopics} topics`, color: "primary" },
    { label: "Subjects", value: `${subjects.length}`, icon: BookOpen, change: "Click to manage", color: "success", onClick: () => navigate("/subject-management") },
    { label: "Next Exam", value: nextExam ? `${nextExam.daysLeft}d` : "—", icon: CalendarClock, change: nextExam?.exam.label || "Set exam dates", color: isRevisionMode ? "destructive" : "accent", onClick: () => setExamModalOpen(true) },
    { label: "Study Streak", value: `${streak}`, icon: Flame, change: streak > 0 ? `${streak} day streak 🔥` : "Complete a topic!", color: "accent", tooltip: "Your streak increases by 1 each day you complete at least 1 topic. Don't miss a day or it resets!" },
  ];

  return (
    <AppLayout examDates={examDates}>
      <div className={`max-w-6xl mx-auto space-y-6 ${isRevisionMode ? "revision-mode" : ""}`}>
        {isRevisionMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30"
          >
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-bold text-destructive">🔥 Revision Mode Active</p>
              <p className="text-xs text-destructive/80">{nextExam!.exam.label} in {nextExam!.daysLeft} days — Focus on high-weightage topics!</p>
            </div>
          </motion.div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Stats Center</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your SPPU study progress</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30">
              <Flame className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold font-mono text-accent">{streak}</span>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <DashboardSearch subjects={subjects} allUnits={allUnits} />

        {/* Resume Study */}
        {lastStudied && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => navigate(`/subject/${lastStudied.subjectId}`)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors text-left"
            >
              <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Resume Study</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {lastStudied.topicName} · {lastStudied.subjectName} › {lastStudied.unitName}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                {new Date(lastStudied.timestamp).toLocaleDateString()}
              </span>
            </button>
          </motion.div>
        )}

        {/* Goal Warnings */}
        {goalWarnings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-accent/10 border border-accent/30"
          >
            <p className="text-sm font-bold text-accent mb-1">⚠️ Behind Schedule</p>
            {goalWarnings.map(s => {
              const prog = subjectProgress[s.id];
              const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;
              return (
                <p key={s.id} className="text-xs text-accent/80">
                  {s.name}: {pct}% done — Target Grade: {s.target_grade} CGPA
                </p>
              );
            })}
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-4 ${stat.onClick ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""}`}
              onClick={stat.onClick}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    {stat.label}
                    {stat.tooltip && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          <p>{stat.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </p>
                  <p className="text-2xl font-bold font-mono mt-1 text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {stat.change}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.color === "accent" ? "gradient-accent" : stat.color === "destructive" ? "bg-destructive" : "gradient-primary"}`}>
                  <stat.icon className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {subjects.length === 0 && !loading ? (
          <OnboardingWizard />
        ) : (
          <>
            <ExamCountdown exam={nextExam?.exam} daysLeft={nextExam?.daysLeft} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DailyStudyGoal />
              <WeeklyReport subjects={subjects} subjectProgress={subjectProgress} syllabusPercent={syllabusPercent} />
            </div>

            <StudyHeatmap />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubjectChart subjects={subjects} />
              <div className="glass-card p-5">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-accent" />
                  Your Subjects
                </h3>
                <p className="text-xs text-muted-foreground font-mono mb-4">Click to view units & topics</p>
                <div className="space-y-3">
                  {subjects.map((subj) => {
                    const prog = subjectProgress[subj.id] || { total: 0, done: 0, unitsDone: 0 };
                    const segments = Array.from({ length: 6 }, (_, i) => ({ filled: i < prog.unitsDone }));
                    return (
                      <div
                        key={subj.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => navigate(`/subject/${subj.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <CircularProgress segments={segments} size={44} strokeWidth={4} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{subj.name}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              {prog.done}/{prog.total} topics · {prog.unitsDone}/6 units
                              {subj.target_grade ? ` · Target: ${subj.target_grade}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <QuickExamModal
        open={examModalOpen}
        onOpenChange={setExamModalOpen}
        onExamAdded={() => getExamDates().then(setExamDates)}
      />
    </AppLayout>
  );
}
