import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, BookOpen, Target, TrendingUp, Plus, AlertTriangle, CalendarClock } from "lucide-react";
import StudyHeatmap from "../components/StudyHeatmap";
import SubjectChart from "../components/SubjectChart";
import ExamCountdown from "../components/ExamCountdown";
import WeeklyReport from "../components/WeeklyReport";
import AppLayout from "../components/AppLayout";
import CircularProgress from "../components/CircularProgress";
import { Button } from "@/components/ui/button";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getExamDates, getNextExam, type ExamDate } from "@/lib/exam-store";
import { getUnitsWithTopics } from "@/lib/units-store";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [examDates, setExamDates] = useState<ExamDate[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<Record<string, { total: number; done: number; unitsDone: number }>>({});

  useEffect(() => {
    Promise.all([
      getSubjects(),
      getExamDates(),
    ]).then(async ([subs, exams]) => {
      setSubjects(subs);
      setExamDates(exams);

      // Load unit/topic progress for each subject
      const progress: Record<string, { total: number; done: number; unitsDone: number }> = {};
      await Promise.all(
        subs.map(async (s) => {
          try {
            const units = await getUnitsWithTopics(s.id);
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
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const nextExam = getNextExam(examDates);
  const isRevisionMode = nextExam && nextExam.daysLeft <= 7;

  const totalTopics = Object.values(subjectProgress).reduce((a, p) => a + p.total, 0);
  const completedTopics = Object.values(subjectProgress).reduce((a, p) => a + p.done, 0);
  const syllabusPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const statCards = [
    { label: "Syllabus Done", value: `${syllabusPercent}%`, icon: Target, change: `${completedTopics}/${totalTopics} topics`, color: "primary" },
    { label: "Subjects", value: `${subjects.length}`, icon: BookOpen, change: "Click to manage", color: "success", onClick: () => navigate("/subject-management") },
    { label: "Next Exam", value: nextExam ? `${nextExam.daysLeft}d` : "—", icon: CalendarClock, change: nextExam?.exam.label || "Set exam dates", color: isRevisionMode ? "destructive" : "accent" },
    { label: "Topics Today", value: "0", icon: Flame, change: "Start studying!", color: "accent" },
  ];

  return (
    <AppLayout>
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

        <div>
          <h1 className="text-2xl font-bold text-foreground">Stats Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your SPPU study progress</p>
        </div>

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
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Subjects Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Create your first subject to start tracking your SPPU study progress.
            </p>
            <Button onClick={() => navigate("/subject-management")}>
              <Plus className="w-4 h-4 mr-1" /> Create Your First Subject
            </Button>
          </motion.div>
        ) : (
          <>
            {nextExam && <ExamCountdown exam={nextExam.exam} daysLeft={nextExam.daysLeft} />}
            <WeeklyReport subjects={subjects} subjectProgress={subjectProgress} syllabusPercent={syllabusPercent} />

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
    </AppLayout>
  );
}
