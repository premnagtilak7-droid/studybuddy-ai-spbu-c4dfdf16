import { useState, useEffect, useCallback } from "react";
import TrialBanner from "@/components/TrialBanner";
import { motion } from "framer-motion";
import { Clock, Flame, BookOpen, Target, TrendingUp, Plus, AlertTriangle, CalendarClock, PlayCircle, Zap, Timer } from "lucide-react";
import StudyHeatmap from "../components/StudyHeatmap";
import SubjectChart from "../components/SubjectChart";
import ExamCountdown from "../components/ExamCountdown";
import WeeklyProgressSummary from "../components/WeeklyProgressSummary";
import AppLayout from "../components/AppLayout";
import CircularProgress from "../components/CircularProgress";
import DashboardSearch from "../components/DashboardSearch";
import SubjectProgressBar from "../components/SubjectProgressBar";
import OnboardingWizard from "../components/OnboardingWizard";
import QuickExamModal from "../components/QuickExamModal";
import WeeklyStudyChart from "../components/WeeklyStudyChart";
import DailyStudyGoal from "../components/DailyStudyGoal";
import TimetableDayProgress from "../components/TimetableDayProgress";
import RevisionSchedule from "../components/RevisionSchedule";
import AchievementBadges from "../components/AchievementBadges";
import GettingStartedChecklist from "../components/GettingStartedChecklist";
import LevelBadge from "../components/LevelBadge";
import WeeklyChallenges from "../components/WeeklyChallenges";
import Leaderboard from "../components/Leaderboard";
import { XPNotificationContainer } from "../components/XPNotification";
import { emitXP } from "../components/XPNotification";
import { Button } from "@/components/ui/button";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getExamDates, getNextExam, type ExamDate } from "@/lib/exam-store";
import { getUnitsWithTopics, type Unit } from "@/lib/units-store";
import { getLastStudied, getStudyStreak, syncStudyDates, getStudyStreakFromDB } from "@/lib/study-tracker";
import { getTodayStudyMinutes } from "@/lib/daily-goal-store";
import { getUserXP, awardXP } from "@/lib/xp-store";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [examDates, setExamDates] = useState<ExamDate[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<Record<string, { total: number; done: number; unitsDone: number }>>({});
  const [allUnits, setAllUnits] = useState<Record<string, Unit[]>>({});
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [xp, setXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [gamificationCounts, setGamificationCounts] = useState({ doubts: 0, plans: 0, tests: 0 });
  const [displayName, setDisplayName] = useState("");
  const [educationType, setEducationType] = useState("");
  const [educationDetails, setEducationDetails] = useState<any>({});

  const lastStudied = getLastStudied();

  useEffect(() => {
    awardXP("daily_login").then((amount) => { if (amount > 0) emitXP(amount, "Daily login bonus"); });
    syncStudyDates().then(() => {
      getStudyStreakFromDB().then(s => {
        setStreak(s);
        if (s > 0) awardXP("streak_bonus").then((amount) => { if (amount > 0) emitXP(amount, `${s}-day streak bonus`); });
      });
    });
    getUserXP().then(setXP);
    getTodayStudyMinutes().then(setTodayMinutes);
    // Fetch profile for personalized welcome
    if (user) {
      supabase.from("profiles").select("display_name, education_type, education_details").eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setDisplayName((data as any).display_name || "");
          setEducationType((data as any).education_type || "");
          setEducationDetails((data as any).education_details || {});
        }
      });
    }
  }, [user]);

  const loadData = useCallback(async () => {
    try {
      const [subs, exams] = await Promise.all([getSubjects(), getExamDates()]);
      setSubjects(subs);
      setExamDates(exams);

      const progress: Record<string, { total: number; done: number; unitsDone: number }> = {};
      const unitsMap: Record<string, Unit[]> = {};
      await Promise.all(subs.map(async (s) => {
        try {
          const units = await getUnitsWithTopics(s.id);
          unitsMap[s.id] = units;
          const total = units.reduce((a, u) => a + (u.topics?.length || 0), 0);
          const done = units.reduce((a, u) => a + (u.topics?.filter(t => t.is_completed).length || 0), 0);
          const unitsDone = units.filter(u => { const topics = u.topics || []; return topics.length > 0 && topics.every(t => t.is_completed); }).length;
          progress[s.id] = { total, done, unitsDone };
        } catch { progress[s.id] = { total: 0, done: 0, unitsDone: 0 }; }
      }));
      setSubjectProgress(progress);
      setAllUnits(unitsMap);
      setLoading(false);
    } catch { setLoading(false); }
    loadGamificationCounts();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime sync
  useRealtimeSubscription("subjects", loadData);
  useRealtimeSubscription("topics", loadData);
  useRealtimeSubscription("study_logs", useCallback(() => { getTodayStudyMinutes().then(setTodayMinutes); }, []));

  async function loadGamificationCounts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [doubts, plans, tests] = await Promise.all([
      supabase.from("doubt_history").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("study_plans").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("mock_tests").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setGamificationCounts({ doubts: doubts.count ?? 0, plans: plans.count ?? 0, tests: tests.count ?? 0 });
  }

  const nextExam = getNextExam(examDates);
  const isRevisionMode = nextExam && nextExam.daysLeft <= 7;
  const totalTopics = Object.values(subjectProgress).reduce((a, p) => a + p.total, 0);
  const completedTopics = Object.values(subjectProgress).reduce((a, p) => a + p.done, 0);
  const syllabusPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const totalUnits = subjects.reduce((a, s) => a + s.target_units, 0);

  const goalWarnings = subjects.filter(s => {
    if (!s.target_grade || !nextExam) return false;
    const prog = subjectProgress[s.id];
    if (!prog || prog.total === 0) return false;
    const progressPct = (prog.done / prog.total) * 100;
    const expectedPct = Math.max(0, 100 - nextExam.daysLeft * 2);
    return progressPct < expectedPct;
  });

  // Personalized welcome based on education type
  const getWelcomeTitle = () => {
    const name = displayName ? `, ${displayName.split(" ")[0]}` : "";
    const typeMessages: Record<string, string> = {
      school: `📖 School Dashboard${name}`,
      undergraduate: `🎓 College Dashboard${name}`,
      postgraduate: `🎓 PG Dashboard${name}`,
      competitive_exam: `🎯 Exam Prep${name}`,
      professional: `💼 Professional Studies${name}`,
      self_learning: `🌟 Learning Hub${name}`,
    };
    return typeMessages[educationType] || `📊 Stats Center${name}`;
  };

  const getWelcomeSubtitle = () => {
    const contextMessages: Record<string, string> = {
      school: educationDetails.board ? `Class ${educationDetails.class_level || ""} · ${educationDetails.board}` : "",
      undergraduate: educationDetails.course_name ? `${educationDetails.course_name}${educationDetails.semester ? ` · Sem ${educationDetails.semester}` : ""}` : "",
      postgraduate: educationDetails.course_name || "",
      competitive_exam: educationDetails.exam_name ? `Preparing for ${educationDetails.exam_name}` : "",
      professional: educationDetails.course_name || "",
      self_learning: educationDetails.learning_goal || "",
    };
    const context = contextMessages[educationType];
    if (context) return context;
    return getMotivation();
  };

  // Motivational message
  const getMotivation = () => {
    if (streak >= 7) return "🔥 Incredible streak! You're unstoppable!";
    if (streak >= 3) return "💪 Great consistency! Keep the momentum going!";
    if (todayMinutes >= 120) return "📚 Amazing study session today! You're crushing it!";
    if (todayMinutes > 0) return "👍 Good start today! Keep pushing forward!";
    return "🚀 Ready to study? Start a timer and build your streak!";
  };

  const statCards = [
    { label: "Syllabus Done", value: `${syllabusPercent}%`, icon: Target, change: `${completedTopics}/${totalTopics} topics`, color: "primary" },
    { label: "Today's Study", value: `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`, icon: Clock, change: "Study time today", color: "accent", onClick: () => navigate("/study-timer") },
    { label: "Subjects", value: `${subjects.length}`, icon: BookOpen, change: `${totalUnits} units total`, color: "success", onClick: () => navigate("/subject-management") },
    { label: "Next Exam", value: nextExam ? `${nextExam.daysLeft}d` : "—", icon: CalendarClock, change: nextExam?.exam.label || "Set exam dates", color: isRevisionMode ? "destructive" : "accent", onClick: () => setExamModalOpen(true) },
    { label: "XP Points", value: `${xp}`, icon: Zap, change: `Study to earn more XP`, color: "accent" },
    { label: "Streak", value: `${streak} 🔥`, icon: Flame, change: streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''} straight!` : "Study today to start", color: "primary" },
  ];

  return (
    <AppLayout examDates={examDates}>
      <XPNotificationContainer />
      <TrialBanner />
      <div className={`max-w-6xl mx-auto space-y-6 ${isRevisionMode ? "revision-mode" : ""}`}>
        {isRevisionMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div><p className="text-sm font-bold text-destructive">🔥 Revision Mode Active</p><p className="text-xs text-destructive/80">{nextExam!.exam.label} in {nextExam!.daysLeft} days — Focus on high-weightage topics!</p></div>
          </motion.div>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{getWelcomeTitle()}</h1>
            <p className="text-sm text-muted-foreground mt-1">{getWelcomeSubtitle() || getMotivation()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/study-timer")} className="gap-1.5">
              <Timer className="w-4 h-4" /> Study Timer
            </Button>
            <LevelBadge xp={xp} compact />
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30">
                <Flame className="w-4 h-4 text-accent" />
                <span className="text-sm font-bold font-mono text-accent">{streak}</span>
              </div>
            )}
          </div>
        </div>

        <DashboardSearch subjects={subjects} allUnits={allUnits} />

        {lastStudied && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => navigate(`/subject/${lastStudied.subjectId}`)} className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors text-left">
              <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Resume Study</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{lastStudied.topicName} · {lastStudied.subjectName} › {lastStudied.unitName}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{new Date(lastStudied.timestamp).toLocaleDateString()}</span>
            </button>
          </motion.div>
        )}

        {goalWarnings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-accent/10 border border-accent/30">
            <p className="text-sm font-bold text-accent mb-1">⚠️ Behind Schedule</p>
            {goalWarnings.map(s => {
              const prog = subjectProgress[s.id];
              const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;
              return <p key={s.id} className="text-xs text-accent/80">{s.name}: {pct}% done — Target Grade: {s.target_grade} CGPA</p>;
            })}
          </motion.div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`glass-card p-3 sm:p-4 ${stat.onClick ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""}`} onClick={stat.onClick}>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{stat.label}</p>
                <p className="text-lg sm:text-xl font-bold font-mono mt-0.5 text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1 truncate"><TrendingUp className="w-3 h-3 flex-shrink-0" /> {stat.change}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <LevelBadge xp={xp} />
        </motion.div>

        {subjects.length === 0 && !loading ? (
          <OnboardingWizard />
        ) : !loading ? (
          <>
            <GettingStartedChecklist subjects={subjects} examDates={examDates} totalTopics={totalTopics} completedTopics={completedTopics} hasTimetable={!!localStorage.getItem("sppu_timetable_visited")} />
            <ExamCountdown exam={nextExam?.exam} daysLeft={nextExam?.daysLeft} />
            <WeeklyChallenges />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DailyStudyGoal />
              <TimetableDayProgress />
            </div>
            <WeeklyProgressSummary subjects={subjects} subjectProgress={subjectProgress} syllabusPercent={syllabusPercent} />
            <RevisionSchedule subjects={subjects} />
            <WeeklyStudyChart />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AchievementBadges subjectCount={subjects.length} streak={streak} syllabusPercent={syllabusPercent} examCount={examDates.length} pomodoroSessions={0} doubtsAsked={gamificationCounts.doubts} studyPlans={gamificationCounts.plans} mockTests={gamificationCounts.tests} />
              <Leaderboard />
            </div>
            <StudyHeatmap />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubjectChart subjects={subjects} />
              <div className="glass-card p-5">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2"><Flame className="w-4 h-4 text-accent" /> Your Subjects</h3>
                <p className="text-xs text-muted-foreground font-mono mb-4">Click to view units & topics</p>
                <div className="space-y-3">
                  {subjects.map((subj) => {
                    const prog = subjectProgress[subj.id] || { total: 0, done: 0, unitsDone: 0 };
                    const segments = Array.from({ length: subj.target_units }, (_, i) => ({ filled: i < prog.unitsDone }));
                    return (
                      <div key={subj.id} className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate(`/subject/${subj.id}`)}>
                        <div className="flex items-center gap-3">
                          <CircularProgress segments={segments} size={44} strokeWidth={4} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{subj.name}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{prog.done}/{prog.total} topics · {prog.unitsDone}/{subj.target_units} units{subj.target_grade ? ` · Target: ${subj.target_grade}` : ""}</p>
                          </div>
                        </div>
                        <SubjectProgressBar done={prog.done} total={prog.total} className="mt-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <QuickExamModal open={examModalOpen} onOpenChange={setExamModalOpen} onExamAdded={() => getExamDates().then(setExamDates)} />
    </AppLayout>
  );
}
