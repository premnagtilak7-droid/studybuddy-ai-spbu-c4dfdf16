import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Leaderboard from "@/components/Leaderboard";
import { detectSupport } from "@/lib/focus-block";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getDailyGoal, setDailyGoal, getTodayStudyMinutes, logStudyMinutes } from "@/lib/daily-goal-store";
import { recordStudySession, getStudyDates, syncStudyDates, getStudyStreakFromDB } from "@/lib/study-tracker";
import { awardXP } from "@/lib/xp-store";
import { upsertTimer, getActiveTimer, clearTimer as clearTimerDB } from "@/lib/timer-store";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Play, Pause, Square, RotateCcw, Timer, Clock, Brain, Coffee,
  Flame, Target, History, BarChart3, StickyNote,
  Volume2, Maximize2, Minimize2, Shield, Ban, ChevronDown, Trophy,
} from "lucide-react";
import StudyRemindersCard from "@/components/StudyRemindersCard";
import { registerCustomSW, requestNotificationPermissionWithPrompt, sendToSW } from "@/lib/service-worker-manager";
import { startReminderChecker } from "@/lib/study-reminders";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ── Sound ──
function playBell() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

// ── Push notification via Service Worker ──
function sendPushNotification(title: string, body: string) {
  try {
    // Try service worker first (works even when tab is closed)
    sendToSW({ type: 'TIMER_COMPLETE', data: { title, body } });
    // Fallback to regular notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/pwa-192x192.png", tag: "study-timer" });
    }
  } catch {}
}

type TimerMode = "stopwatch" | "countdown" | "pomodoro";
type PomodoroPhase = "focus" | "short-break" | "long-break";
type SessionRecord = { id: string; duration_minutes: number; logged_at: string; subject_id: string | null; notes?: string; mode?: string; };

const POMODORO: Record<PomodoroPhase, number> = { focus: 25 * 60, "short-break": 5 * 60, "long-break": 15 * 60 };

function fmt(s: number) {
  const abs = Math.abs(Math.floor(s));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const sec = abs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function StudyTimer() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("none");
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [countdownTarget, setCountdownTarget] = useState(45);
  const [countdownLeft, setCountdownLeft] = useState(45 * 60);
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>("focus");
  const [pomLeft, setPomLeft] = useState(POMODORO.focus);
  const [pomSessions, setPomSessions] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const [focusUI, setFocusUI] = useState(false);
  const [dailyGoalHours, setDailyGoalHours] = useState(4);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(4);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ name: string; minutes: number; color: string }[]>([]);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [sessionNote, setSessionNote] = useState("");
  const pendingDuration = useRef(0);
  // Track the real start time for DB persistence
  const dbStartTimeRef = useRef<string>(new Date().toISOString());
  const restoredRef = useRef(false);

  // Focus settings (merged from Focus Mode page)
  const [focusSettingsOpen, setFocusSettingsOpen] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const platform = useRef(detectSupport()).current;
  const [focusBlock, setFocusBlock] = useState(false);
  const [currentTask, setCurrentTask] = useState("");
  const runningRef = useRef(false);
  const strictRef = useRef(false);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { strictRef.current = strictMode; }, [strictMode]);

  // Strict-mode tab-leave detection: pause timer + small XP penalty
  useEffect(() => {
    if (!running || !strictMode) return;
    const onVisibility = () => {
      if (document.hidden && runningRef.current && strictRef.current) {
        pauseTimer();
        awardXP("focus_session", -10).catch(() => {});
        toast.warning("You left the session — paused. -10 XP");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, strictMode]);

  const studyDatesSet = useMemo(() => new Set(getStudyDates()), []);

  // ── Init Web Worker ──
  useEffect(() => {
    try {
      workerRef.current = new Worker("/timer-worker.js");
      workerRef.current.onmessage = handleWorkerMessage;
    } catch (err) {
      console.warn("Web Worker not available, falling back to setInterval");
    }
    return () => { workerRef.current?.terminate(); };
  }, []);

  // Stable handler ref to avoid re-creating worker
  const handleWorkerMessage = useCallback((e: MessageEvent) => {
    const { type, elapsed: wElapsed, remaining, phase, completedPhase, nextPhase, sessionsDone } = e.data;

    if (type === "tick") {
      setMode(prev => {
        if (prev === "stopwatch") setElapsed(wElapsed);
        else if (prev === "countdown") setCountdownLeft(remaining ?? 0);
        else if (prev === "pomodoro") {
          setPomLeft(remaining ?? 0);
          if (phase) setPomPhase(phase as PomodoroPhase);
        }
        return prev;
      });
    }

    if (type === "complete") {
      // Countdown finished
      playBell();
      sendPushNotification("⏰ Countdown Complete!", "Your countdown timer has ended.");
      setRunning(false);
      setCountdownLeft(0);
      setMode(prev => {
        if (prev === "countdown") {
          setCountdownTarget(ct => { finishSession(ct); return ct; });
        }
        return prev;
      });
      clearTimerDB();
    }

    if (type === "pomodoro_phase_complete") {
      playBell();
      setPomPhase(nextPhase as PomodoroPhase);
      setPomSessions(sessionsDone);
      setPomLeft(POMODORO[nextPhase as PomodoroPhase]);

      if (completedPhase === "focus") {
        sendPushNotification("☕ Focus session done!", "Time for a break.");
        finishSession(25);
        awardXP("focus_session").then(a => { if (a > 0) toast.success(`+${a} XP!`); });
        toast.success("Focus session complete! Take a break.");
      } else {
        sendPushNotification("🧠 Break over!", "Time to focus again.");
        toast.info("Break over! Time to focus.");
      }

      // Auto-start next phase via worker
      dbStartTimeRef.current = new Date().toISOString();
      workerRef.current?.postMessage({
        type: "start",
        data: {
          mode: "pomodoro",
          elapsed: 0,
          pomodoroPhase: nextPhase,
          pomodoroSessionsDone: sessionsDone,
        },
      });
      // Keep running = true (auto-switch)
    }

    if (type === "paused") {
      setElapsed(wElapsed);
    }
    if (type === "stopped") {
      setElapsed(wElapsed);
    }
  }, []);

  // ── Register service worker & start reminder checker ──
  useEffect(() => {
    registerCustomSW();
    startReminderChecker();
  }, []);

  // ── Load initial data ──
  useEffect(() => {
    getSubjects().then(subs => {
      setSubjects(subs);
      const paramSubject = searchParams.get("subject");
      if (paramSubject && subs.some(s => s.id === paramSubject)) {
        setSelectedSubject(paramSubject);
      }
    });
    getDailyGoal().then(setDailyGoalHours);
    getTodayStudyMinutes().then(setTodayMinutes);
    syncStudyDates().then(() => { getStudyStreakFromDB().then(setStreak); });
    loadHistory();
  }, []);

  // ── Restore timer from DB ──
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    getActiveTimer().then(timer => {
      if (!timer) return;
      setMode(timer.mode as TimerMode);
      if (timer.subject_id) setSelectedSubject(timer.subject_id);
      dbStartTimeRef.current = timer.started_at;

      if (timer.is_running) {
        const now = Date.now();
        const startedAt = new Date(timer.started_at).getTime();
        const runElapsed = timer.elapsed_seconds + Math.floor((now - startedAt) / 1000);

        if (timer.mode === "stopwatch") {
          setElapsed(runElapsed);
          setRunning(true);
          workerRef.current?.postMessage({ type: "start", data: { mode: "stopwatch", elapsed: runElapsed } });
        } else if (timer.mode === "countdown" && timer.countdown_target_seconds) {
          const remaining = Math.max(0, timer.countdown_target_seconds - runElapsed);
          setCountdownTarget(Math.ceil(timer.countdown_target_seconds / 60));
          setCountdownLeft(remaining);
          if (remaining > 0) {
            setRunning(true);
            workerRef.current?.postMessage({ type: "start", data: { mode: "countdown", elapsed: runElapsed, targetSeconds: timer.countdown_target_seconds } });
          } else {
            playBell();
            sendPushNotification("⏰ Countdown Complete!", "Your countdown timer has ended.");
            finishSession(Math.ceil(timer.countdown_target_seconds / 60));
            clearTimerDB();
          }
        } else if (timer.mode === "pomodoro") {
          const phase = (timer.pomodoro_phase || "focus") as PomodoroPhase;
          const sessions = timer.pomodoro_sessions_done || 0;
          setPomPhase(phase);
          setPomSessions(sessions);
          const remaining = Math.max(0, POMODORO[phase] - runElapsed);
          setPomLeft(remaining);
          if (remaining > 0) {
            setRunning(true);
            workerRef.current?.postMessage({ type: "start", data: { mode: "pomodoro", elapsed: runElapsed, pomodoroPhase: phase, pomodoroSessionsDone: sessions } });
          }
        }
      } else {
        setElapsed(timer.elapsed_seconds);
        if (timer.mode === "countdown" && timer.countdown_target_seconds) {
          setCountdownTarget(Math.ceil(timer.countdown_target_seconds / 60));
          setCountdownLeft(Math.max(0, timer.countdown_target_seconds - timer.elapsed_seconds));
        }
        if (timer.mode === "pomodoro") {
          setPomPhase((timer.pomodoro_phase || "focus") as PomodoroPhase);
          setPomSessions(timer.pomodoro_sessions_done || 0);
          setPomLeft(Math.max(0, POMODORO[(timer.pomodoro_phase || "focus") as PomodoroPhase] - timer.elapsed_seconds));
        }
      }
    });
  }, []);

  // ── Cross-device sync via realtime ──
  const handleTimerSync = useCallback(() => {
    // When timer_sessions changes on another device, reload state
    getActiveTimer().then(timer => {
      if (!timer) {
        // Timer was cleared on another device
        setRunning(false);
        setElapsed(0);
        return;
      }
      // Only update if the change came from another device (different updated_at)
      if (timer.is_running) {
        const now = Date.now();
        const startedAt = new Date(timer.started_at).getTime();
        const runElapsed = timer.elapsed_seconds + Math.floor((now - startedAt) / 1000);
        setMode(timer.mode as TimerMode);
        if (timer.subject_id) setSelectedSubject(timer.subject_id);

        if (timer.mode === "stopwatch") setElapsed(runElapsed);
        else if (timer.mode === "countdown" && timer.countdown_target_seconds) {
          setCountdownTarget(Math.ceil(timer.countdown_target_seconds / 60));
          setCountdownLeft(Math.max(0, timer.countdown_target_seconds - runElapsed));
        } else if (timer.mode === "pomodoro") {
          const phase = (timer.pomodoro_phase || "focus") as PomodoroPhase;
          setPomPhase(phase);
          setPomSessions(timer.pomodoro_sessions_done || 0);
          setPomLeft(Math.max(0, POMODORO[phase] - runElapsed));
        }
      }
    });
  }, []);
  useRealtimeSubscription("timer_sessions", handleTimerSync);

  // ── Realtime sync for study_logs ──
  const reloadHistory = useCallback(() => { loadHistory(); getTodayStudyMinutes().then(setTodayMinutes); }, []);
  useRealtimeSubscription("study_logs", reloadHistory);

  async function loadHistory() {
    const { data } = await supabase.from("study_logs").select("*").order("logged_at", { ascending: false }).limit(50);
    setHistory((data || []) as SessionRecord[]);
    const subs = await getSubjects();
    const { data: allLogs } = await supabase.from("study_logs").select("subject_id, duration_minutes");
    const map = new Map<string, number>();
    (allLogs || []).forEach((l: any) => { if (l.subject_id) map.set(l.subject_id, (map.get(l.subject_id) || 0) + l.duration_minutes); });
    setSubjectStats(subs.filter(s => map.has(s.id)).map(s => ({ name: s.code || s.name, minutes: map.get(s.id)!, color: s.color })));
  }

  // ── Tab title ──
  useEffect(() => {
    if (!running) { document.title = "StudyBuddy"; return; }
    const subName = subjects.find(s => s.id === selectedSubject)?.code;
    const label = mode === "stopwatch" ? fmt(elapsed) : mode === "countdown" ? fmt(countdownLeft) : fmt(pomLeft);
    document.title = `⏱ ${label}${subName ? ` - ${subName}` : ""} — Study Timer`;
    return () => { document.title = "StudyBuddy"; };
  }, [running, elapsed, countdownLeft, pomLeft, mode, selectedSubject, subjects]);

  // ── Persist timer state to DB every 10s ──
  useEffect(() => {
    if (!running || !user) return;
    // Persist immediately on start
    persistTimerState();
    const interval = setInterval(persistTimerState, 10000);
    return () => clearInterval(interval);
  }, [running, mode, selectedSubject, pomPhase, pomSessions, countdownTarget, user]);

  function persistTimerState() {
    const subId = selectedSubject !== "none" ? selectedSubject : null;
    upsertTimer({
      mode,
      subject_id: subId,
      is_running: true,
      elapsed_seconds: 0, // elapsed from the started_at reference point
      started_at: dbStartTimeRef.current,
      countdown_target_seconds: mode === "countdown" ? countdownTarget * 60 : null,
      pomodoro_phase: pomPhase,
      pomodoro_sessions_done: pomSessions,
    }).catch(() => {});
  }

  // ── Start/pause via Worker ──
  async function startTimer() {
    // Ask for notification permission on first timer start
    await requestNotificationPermissionWithPrompt();
    
    dbStartTimeRef.current = new Date().toISOString();
    setRunning(true);

    if (mode === "stopwatch") {
      workerRef.current?.postMessage({ type: "start", data: { mode: "stopwatch", elapsed } });
    } else if (mode === "countdown") {
      const elapsedSoFar = countdownTarget * 60 - countdownLeft;
      workerRef.current?.postMessage({ type: "start", data: { mode: "countdown", elapsed: elapsedSoFar, targetSeconds: countdownTarget * 60 } });
    } else {
      const elapsedSoFar = POMODORO[pomPhase] - pomLeft;
      workerRef.current?.postMessage({ type: "start", data: { mode: "pomodoro", elapsed: elapsedSoFar, pomodoroPhase: pomPhase, pomodoroSessionsDone: pomSessions } });
    }
  }

  function pauseTimer() {
    setRunning(false);
    workerRef.current?.postMessage({ type: "pause", data: {} });
    // Persist paused state
    const subId = selectedSubject !== "none" ? selectedSubject : null;
    upsertTimer({
      mode, subject_id: subId, is_running: false,
      elapsed_seconds: mode === "stopwatch" ? elapsed : mode === "countdown" ? (countdownTarget * 60 - countdownLeft) : (POMODORO[pomPhase] - pomLeft),
      started_at: dbStartTimeRef.current,
      countdown_target_seconds: mode === "countdown" ? countdownTarget * 60 : null,
      pomodoro_phase: pomPhase, pomodoro_sessions_done: pomSessions,
    }).catch(() => {});
  }

  function finishSession(durationMins: number) {
    if (durationMins < 1) return;
    pendingDuration.current = durationMins;
    setShowNoteDialog(true);
  }

  async function saveSession(note: string) {
    const mins = pendingDuration.current;
    if (mins < 1) return;
    const subId = selectedSubject !== "none" ? selectedSubject : undefined;
    await logStudyMinutes(mins, subId);
    recordStudySession();
    setTodayMinutes(prev => prev + mins);
    toast.success(`${mins} min session saved!`);
    setShowNoteDialog(false); setSessionNote("");
    clearTimerDB();
    loadHistory(); getTodayStudyMinutes().then(setTodayMinutes);
    getStudyStreakFromDB().then(setStreak);
  }

  function stopStopwatch() {
    workerRef.current?.postMessage({ type: "stop", data: {} });
    setRunning(false);
    const mins = Math.max(1, Math.round(elapsed / 60));
    finishSession(mins); setElapsed(0);
  }

  function switchMode(m: TimerMode) {
    workerRef.current?.postMessage({ type: "reset", data: {} });
    setRunning(false); setMode(m);
    if (m === "stopwatch") setElapsed(0);
    if (m === "countdown") setCountdownLeft(countdownTarget * 60);
    if (m === "pomodoro") { setPomPhase("focus"); setPomLeft(POMODORO.focus); setPomSessions(0); }
    clearTimerDB();
  }

  function resetCurrentTimer() {
    workerRef.current?.postMessage({ type: "reset", data: {} });
    setRunning(false);
    if (mode === "countdown") setCountdownLeft(countdownTarget * 60);
    if (mode === "pomodoro") setPomLeft(POMODORO[pomPhase]);
  }

  async function handleSaveGoal() {
    await setDailyGoal(goalInput);
    setDailyGoalHours(goalInput); setEditGoal(false);
    toast.success("Daily goal updated!");
  }

  const displayTime = mode === "stopwatch" ? fmt(elapsed) : mode === "countdown" ? fmt(countdownLeft) : fmt(pomLeft);
  const timerProgress = mode === "stopwatch" ? 0 : mode === "countdown" ? (countdownLeft / (countdownTarget * 60)) : (pomLeft / POMODORO[pomPhase]);
  const goalPercent = Math.min(100, Math.round((todayMinutes / (dailyGoalHours * 60)) * 100));

  const heatmapData = useMemo(() => {
    const result: { date: string; active: boolean }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      result.push({ date: ds, active: studyDatesSet.has(ds) });
    }
    return result;
  }, [studyDatesSet]);

  // ── Focus mode ──
  if (focusUI) {
    return (
      <div className="fixed inset-0 bg-background z-[100] flex flex-col items-center justify-center p-4">
        <button onClick={() => setFocusUI(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Minimize2 className="w-5 h-5" /></button>
        <p className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
          {mode === "pomodoro" ? (pomPhase === "focus" ? "Focus" : pomPhase === "short-break" ? "Short Break" : "Long Break") : mode}
        </p>
        <span className="text-6xl sm:text-8xl font-bold font-mono text-foreground">{displayTime}</span>
        {selectedSubject !== "none" && <p className="text-sm text-muted-foreground mt-3">{subjects.find(s => s.id === selectedSubject)?.name}</p>}
        <div className="flex items-center gap-3 mt-8 flex-wrap justify-center">
          {mode === "stopwatch" && running && <Button variant="destructive" size="lg" onClick={stopStopwatch} className="rounded-full gap-2"><Square className="w-4 h-4" /> Stop & Save</Button>}
          {mode === "stopwatch" && !running && <Button size="lg" onClick={startTimer} className="rounded-full px-10 gap-2"><Play className="w-4 h-4" /> Start</Button>}
          {mode !== "stopwatch" && <Button size="lg" onClick={() => running ? pauseTimer() : startTimer()} className="rounded-full px-10 gap-2">{running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{running ? "Pause" : "Start"}</Button>}
        </div>
        <NoteDialog open={showNoteDialog} note={sessionNote} setNote={setSessionNote} onSave={saveSession} onSkip={() => saveSession("")} />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Study Timer</h1>
            <p className="text-sm text-muted-foreground">Track, focus, and improve your study sessions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFocusUI(true)} className="gap-1.5"><Maximize2 className="w-4 h-4" /> Focus Mode</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="No subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No subject</SelectItem>
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {mode === "countdown" && (
                    <div className="w-32">
                      <Label className="text-xs text-muted-foreground mb-1 block">Duration (min)</Label>
                      <Input type="number" min={1} max={180} value={countdownTarget} onChange={e => { const v = parseInt(e.target.value) || 1; setCountdownTarget(v); if (!running) setCountdownLeft(v * 60); }} />
                    </div>
                  )}
                </div>

                <Tabs value={mode} onValueChange={v => switchMode(v as TimerMode)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="stopwatch" className="gap-1.5 text-xs sm:text-sm"><Timer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Stopwatch</span><span className="sm:hidden">SW</span></TabsTrigger>
                    <TabsTrigger value="countdown" className="gap-1.5 text-xs sm:text-sm"><Clock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Countdown</span><span className="sm:hidden">CD</span></TabsTrigger>
                    <TabsTrigger value="pomodoro" className="gap-1.5 text-xs sm:text-sm"><Brain className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Pomodoro</span><span className="sm:hidden">Pom</span></TabsTrigger>
                  </TabsList>
                </Tabs>

                {mode === "pomodoro" && (
                  <div className="flex gap-1.5 justify-center flex-wrap">
                    {(["focus", "short-break", "long-break"] as PomodoroPhase[]).map(p => (
                      <button key={p} onClick={() => { workerRef.current?.postMessage({ type: "reset", data: {} }); setRunning(false); setPomPhase(p); setPomLeft(POMODORO[p]); }} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${pomPhase === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                        {p === "focus" ? "Focus" : p === "short-break" ? "Short Break" : "Long Break"}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col items-center py-4 sm:py-6">
                  <div className="relative w-44 h-44 sm:w-56 sm:h-56">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                      {mode !== "stopwatch" && (
                        <motion.circle cx="100" cy="100" r="90" fill="none" stroke={pomPhase !== "focus" && mode === "pomodoro" ? "hsl(var(--accent))" : "hsl(var(--primary))"} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 90} animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - timerProgress) }} transition={{ duration: 0.5, ease: "easeOut" }} />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl sm:text-5xl font-bold font-mono text-foreground">{displayTime}</span>
                      <span className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                        {mode === "pomodoro" && pomPhase !== "focus" ? <Coffee className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                        {mode === "pomodoro" ? (pomPhase === "focus" ? "Focus" : pomPhase === "short-break" ? "Short Break" : "Long Break") : mode === "stopwatch" ? "Stopwatch" : "Countdown"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
                    {mode === "stopwatch" ? (
                      <>
                        {!running && elapsed === 0 && <Button size="lg" onClick={startTimer} className="rounded-full px-8 sm:px-10 gap-2"><Play className="w-4 h-4" /> Start</Button>}
                        {running && <>
                          <Button variant="outline" size="lg" onClick={pauseTimer} className="rounded-full gap-2"><Pause className="w-4 h-4" /> Pause</Button>
                          <Button variant="destructive" size="lg" onClick={stopStopwatch} className="rounded-full gap-2"><Square className="w-4 h-4" /> Stop</Button>
                        </>}
                        {!running && elapsed > 0 && <>
                          <Button size="lg" onClick={startTimer} className="rounded-full gap-2"><Play className="w-4 h-4" /> Resume</Button>
                          <Button variant="destructive" size="lg" onClick={stopStopwatch} className="rounded-full gap-2"><Square className="w-4 h-4" /> Save</Button>
                          <Button variant="outline" size="icon" onClick={() => { setElapsed(0); clearTimerDB(); }} className="rounded-full"><RotateCcw className="w-4 h-4" /></Button>
                        </>}
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="icon" onClick={resetCurrentTimer} className="rounded-full"><RotateCcw className="w-4 h-4" /></Button>
                        <Button size="lg" onClick={() => running ? pauseTimer() : startTimer()} className="rounded-full px-8 sm:px-10 gap-2">{running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{running ? "Pause" : "Start"}</Button>
                      </>
                    )}
                  </div>

                  {mode === "pomodoro" && (
                    <div className="flex items-center gap-2 mt-4">
                      {Array.from({ length: 4 }, (_, i) => <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < (pomSessions % 4) ? "bg-primary" : "bg-secondary"}`} />)}
                      <span className="text-[10px] font-mono text-muted-foreground ml-1">{pomSessions} sessions</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Focus Settings (merged from Focus Mode) */}
            <Card>
              <Collapsible open={focusSettingsOpen} onOpenChange={setFocusSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Focus Settings</span>
                      {(strictMode || focusBlock) && <Badge variant="secondary" className="text-[10px]">On</Badge>}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${focusSettingsOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Strict Focus Mode</p>
                        <p className="text-xs text-muted-foreground mt-1">Pauses timer + deducts XP when you switch tabs or minimize.</p>
                      </div>
                      <Switch checked={strictMode} onCheckedChange={setStrictMode} />
                    </div>

                    <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Ban className="w-3.5 h-3.5 text-destructive" /> Focus Block
                          <Badge variant="outline" className="text-[9px] ml-1">{platform === "native-android" ? "Android" : "Web — limited"}</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Native app blocking only works in the Android build. On web, tab-leave detection (Strict mode) is used instead.
                        </p>
                      </div>
                      <Switch checked={focusBlock} onCheckedChange={setFocusBlock} disabled={platform !== "native-android"} />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">What are you working on?</Label>
                      <Input
                        placeholder="e.g. Revise Unit 3 — Data Structures"
                        value={currentTask}
                        onChange={e => setCurrentTask(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            <Card>
              <Tabs defaultValue="history">
                <CardHeader className="pb-2">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm"><History className="w-3.5 h-3.5" /> History</TabsTrigger>
                    <TabsTrigger value="subjects" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="w-3.5 h-3.5" /> Subjects</TabsTrigger>
                    <TabsTrigger value="heatmap" className="gap-1.5 text-xs sm:text-sm"><Flame className="w-3.5 h-3.5" /> Heatmap</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="history" className="mt-0">
                    {history.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No sessions yet. Start studying!</p> : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {history.map(h => {
                          const sub = subjects.find(s => s.id === h.subject_id);
                          const date = new Date(h.logged_at);
                          return (
                            <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{h.duration_minutes} min {sub ? `· ${sub.code}` : ""}</p>
                                <p className="text-xs text-muted-foreground font-mono">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                              <Badge variant="secondary" className="text-[10px] flex-shrink-0">{h.duration_minutes}m</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="subjects" className="mt-0">
                    {subjectStats.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No subject data yet.</p> : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={subjectStats}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} label={{ value: "mins", angle: -90, position: "insideLeft", fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => `${v} min`} />
                          <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>{subjectStats.map((s, i) => <Cell key={i} fill={`hsl(var(--${s.color}))`} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </TabsContent>
                  <TabsContent value="heatmap" className="mt-0">
                    <div className="flex flex-wrap gap-1 justify-center py-4">
                      {heatmapData.map((d, i) => <div key={i} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm ${d.active ? "bg-primary" : "bg-secondary"}`} title={`${d.date}: ${d.active ? "Studied" : "No activity"}`} />)}
                    </div>
                    <p className="text-center text-xs text-muted-foreground font-mono">Last 12 weeks</p>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5"><Target className="w-4 h-4 text-primary" /> Daily Goal</CardTitle>
                  <button onClick={() => { setGoalInput(dailyGoalHours); setEditGoal(true); }} className="text-xs text-primary hover:underline">Edit</button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-foreground">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</span>
                  <span className="text-xs text-muted-foreground">/ {dailyGoalHours}h</span>
                </div>
                <Progress value={goalPercent} className="h-2.5 [&>div]:bg-primary" />
                <p className="text-xs text-muted-foreground mt-1.5 font-mono">{goalPercent}% complete</p>
                {editGoal && (
                  <div className="mt-3 flex gap-2 items-end">
                    <div className="flex-1"><Label className="text-xs">Target (hours)</Label><Input type="number" min={0.5} max={16} step={0.5} value={goalInput} onChange={e => setGoalInput(parseFloat(e.target.value) || 1)} /></div>
                    <Button size="sm" onClick={handleSaveGoal}>Save</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center"><Flame className="w-6 h-6 text-accent" /></div>
                  <div><p className="text-2xl font-bold text-foreground">{streak}</p><p className="text-xs text-muted-foreground">Day Streak 🔥</p></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Today's Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sessions today</span><span className="font-medium text-foreground">{history.filter(h => new Date(h.logged_at).toDateString() === new Date().toDateString()).length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total study time</span><span className="font-medium text-foreground">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</span></div>
                {mode === "pomodoro" && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pomodoro sessions</span><span className="font-medium text-foreground">{pomSessions}</span></div>}
              </CardContent>
            </Card>

            <StudyRemindersCard />

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3"><Volume2 className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" /><p className="text-xs text-muted-foreground">Bell + push notification when timer ends. Timer runs in background via Service Worker & persists across devices!</p></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <NoteDialog open={showNoteDialog} note={sessionNote} setNote={setSessionNote} onSave={saveSession} onSkip={() => saveSession("")} />
    </AppLayout>
  );
}

function NoteDialog({ open, note, setNote, onSave, onSkip }: { open: boolean; note: string; setNote: (v: string) => void; onSave: (n: string) => void; onSkip: () => void; }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><StickyNote className="w-4 h-4" /> Session Note</DialogTitle></DialogHeader>
        <Textarea placeholder="What did you cover? (optional)" value={note} onChange={e => setNote(e.target.value)} rows={3} />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          <Button size="sm" onClick={() => onSave(note)}>Save Session</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
