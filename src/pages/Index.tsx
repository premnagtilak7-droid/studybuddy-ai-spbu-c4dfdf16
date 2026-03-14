import { useState, useEffect, useCallback } from "react";
import TrialBanner from "@/components/TrialBanner";
import { motion } from "framer-motion";
import { Clock, Flame, BookOpen, Target, TrendingUp, Plus, AlertTriangle, CalendarClock, PlayCircle, Zap, Timer, Sparkles, Quote } from "lucide-react";
import StudyHeatmap from "../components/StudyHeatmap";
import SubjectChart from "../components/SubjectChart";
import ExamCountdown from "../components/ExamCountdown";
import ExamStudyInsights from "../components/ExamStudyInsights";
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

const MOTIVATIONAL_QUOTES = [
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Study hard, for the well is deep, and our brains are shallow.", author: "Richard Baxter" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

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
  const quote = getDailyQuote();

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

  const getContextSubtitle = () => {
    const msgs: Record<string, string> = {
      school: educationDetails.board ? `Class ${educationDetails.class_level || ""} · ${educationDetails.board}` : "",
      undergraduate: educationDetails.course_name ? `${educationDetails.course_name}${educationDetails.semester ? ` · Sem ${educationDetails.semester}` : ""}` : "",
      postgraduate: educationDetails.course_name || "",
      competitive_exam: educationDetails.exam_name ? `Preparing for ${educationDetails.exam_name}` : "",
      professional: educationDetails.course_name || "",
      self_learning: educationDetails.learning_goal || "",
    };
    return msgs[educationType] || "";
  };

  const statCards = [
    { label: "Syllabus Done", value: `${syllabusPercent}%`, icon: Target, desc: `${completedTopics}/${totalTopics} topics`, gradient: "gradient-primary", iconBg: "bg-primary/20", iconColor: "text-primary" },
    { label: "Today's Study", value: `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`, icon: Clock, desc: "Study time today", gradient: "from-blue-500 to-cyan-400", iconBg: "bg-blue-500/20", iconColor: "text-blue-400", onClick: () => navigate("/study-timer") },
    { label: "Subjects", value: `${subjects.length}`, icon: BookOpen, desc: `${totalUnits} units total`, gradient: "gradient-success", iconBg: "bg-success/20", iconColor: "text-success", onClick: () => navigate("/subject-management") },
    { label: "Next Exam", value: nextExam ? `${nextExam.daysLeft}d` : "—", icon: CalendarClock, desc: nextExam?.exam.label || "Set exam dates", gradient: isRevisionMode ? "gradient-danger" : "gradient-accent", iconBg: isRevisionMode ? "bg-destructive/20" : "bg-accent/20", iconColor: isRevisionMode ? "text-destructive" : "text-accent", onClick: () => setExamModalOpen(true) },
  ];

  return (
    <AppLayout examDates={examDates}>
      <XPNotificationContainer />
      <TrialBanner />
      <div className={`max-w-6xl mx-auto space-y-6 ${isRevisionMode ? "revision-mode" : ""}`}>
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8 gradient-primary"
        >
          <div className="absolute inset-0 gradient-mesh opacity-30" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-primary-foreground/70 text-sm font-medium"
              >
                {getContextSubtitle()}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl sm:text-3xl font-extrabold text-primary-foreground mt-1"
              >
                {getTimeGreeting()}{displayName ? `, ${displayName.split(" ")[0]}` : ""} 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-primary-foreground/80 text-sm mt-2 max-w-md"
              >
                {streak >= 7 ? "🔥 Incredible streak! You're unstoppable!" :
                 streak >= 3 ? "💪 Great consistency! Keep the momentum!" :
                 todayMinutes > 0 ? "👍 Good start today! Keep pushing forward!" :
                 "🚀 Ready to study? Start a timer and build your streak!"}
              </motion.p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/study-timer")}
                className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 backdrop-blur-sm gap-2"
              >
                <Timer className="w-4 h-4" /> Start Studying
              </Button>
              <LevelBadge xp={xp} compact />
            </div>
          </div>

          {/* Floating decorative elements */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary-foreground/5 animate-spin-slow" />
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-primary-foreground/5" />
        </motion.div>

        {/* Revision Mode Warning */}
        {isRevisionMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-2xl gradient-danger text-primary-foreground">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div><p className="text-sm font-bold">🔥 Revision Mode Active</p><p className="text-xs opacity-80">{nextExam!.exam.label} in {nextExam!.daysLeft} days — Focus on high-weightage topics!</p></div>
          </motion.div>
        )}

        {/* Search */}
        <DashboardSearch subjects={subjects} allUnits={allUnits} />

        {/* Streak + XP Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Streak Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card-hover p-5 flex items-center gap-4"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${streak > 0 ? "glow-fire bg-gradient-to-br from-orange-500 to-red-500" : "bg-muted"}`}>
              <span className={`text-2xl ${streak > 0 ? "animate-fire-glow" : ""}`}>🔥</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Study Streak</p>
              <p className="text-3xl font-extrabold font-mono text-foreground">{streak}<span className="text-base font-medium text-muted-foreground ml-1">days</span></p>
            </div>
            {streak > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Keep it up!</p>
                <p className="text-sm font-bold text-accent">{streak >= 7 ? "🏆 Legend" : streak >= 3 ? "⚡ On fire" : "✨ Going"}</p>
              </div>
            )}
          </motion.div>

          {/* XP Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card-hover p-5 flex items-center gap-4 relative overflow-hidden shimmer"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center glow-gold gradient-gold">
              <Zap className="w-7 h-7 text-gold-foreground" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">XP Points</p>
              <p className="text-3xl font-extrabold font-mono text-gradient-gold">{xp}</p>
            </div>
            <div className="relative z-10">
              <LevelBadge xp={xp} compact />
            </div>
          </motion.div>
        </div>

        {/* Resume Study */}
        {lastStudied && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => navigate(`/subject/${lastStudied.subjectId}`)} className="w-full flex items-center gap-3 p-4 rounded-2xl glass-card-hover accent-border-left text-left">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Resume Study</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{lastStudied.topicName} · {lastStudied.subjectName} › {lastStudied.unitName}</p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{new Date(lastStudied.timestamp).toLocaleDateString()}</span>
            </button>
          </motion.div>
        )}

        {/* Goal Warnings */}
        {goalWarnings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl glass-card border-l-4 border-l-accent">
            <p className="text-sm font-bold text-accent mb-1">⚠️ Behind Schedule</p>
            {goalWarnings.map(s => {
              const prog = subjectProgress[s.id];
              const pct = prog ? Math.round((prog.done / prog.total) * 100) : 0;
              return <p key={s.id} className="text-xs text-muted-foreground">{s.name}: {pct}% done — Target Grade: {s.target_grade} CGPA</p>;
            })}
          </motion.div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`glass-card-hover p-4 sm:p-5 ${stat.onClick ? "cursor-pointer" : ""}`}
              onClick={stat.onClick}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono mt-3 text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-1">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{stat.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Motivational Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Quote className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-foreground italic leading-relaxed">"{quote.text}"</p>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">— {quote.author}</p>
          </div>
        </motion.div>

        {/* XP Level Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <LevelBadge xp={xp} />
        </motion.div>

        {subjects.length === 0 && !loading ? (
          <OnboardingWizard />
        ) : !loading ? (
          <>
            <GettingStartedChecklist subjects={subjects} examDates={examDates} totalTopics={totalTopics} completedTopics={completedTopics} hasTimetable={!!localStorage.getItem("sppu_timetable_visited")} />
            <ExamCountdown exam={nextExam?.exam} daysLeft={nextExam?.daysLeft} />
            {educationType === "competitive_exam" && nextExam && (
              <ExamStudyInsights
                examDaysLeft={nextExam.daysLeft}
                totalTopics={totalTopics}
                completedTopics={completedTopics}
                totalDaysForPrep={90}
                educationType={educationType}
                examName={educationDetails?.exam_name}
              />
            )}
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
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Your Subjects</h3>
                <p className="text-xs text-muted-foreground font-mono mb-4">Click to view units & topics</p>
                <div className="space-y-3">
                  {subjects.map((subj) => {
                    const prog = subjectProgress[subj.id] || { total: 0, done: 0, unitsDone: 0 };
                    const segments = Array.from({ length: subj.target_units }, (_, i) => ({ filled: i < prog.unitsDone }));
                    return (
                      <div key={subj.id} className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all cursor-pointer hover:translate-x-1 duration-200" onClick={() => navigate(`/subject/${subj.id}`)}>
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
