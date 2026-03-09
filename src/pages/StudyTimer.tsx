import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getDailyGoal, setDailyGoal, getTodayStudyMinutes, logStudyMinutes } from "@/lib/daily-goal-store";
import { recordStudySession, getStudyStreak, getStudyDates } from "@/lib/study-tracker";
import { awardXP } from "@/lib/xp-store";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Play, Pause, Square, RotateCcw, Timer, Clock, Brain, Coffee,
  Flame, Target, History, BarChart3, ChevronDown, StickyNote,
  Volume2, Maximize2, Minimize2, Settings,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ── Sound ──
function playBell() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

// ── Types ──
type TimerMode = "stopwatch" | "countdown" | "pomodoro";
type PomodoroPhase = "focus" | "short-break" | "long-break";
type SessionRecord = {
  id: string;
  duration_minutes: number;
  logged_at: string;
  subject_id: string | null;
  note?: string;
};

const POMODORO: Record<PomodoroPhase, number> = { focus: 25 * 60, "short-break": 5 * 60, "long-break": 15 * 60 };

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function StudyTimer() {
  const { user } = useAuth();

  // ── Subjects ──
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("none");

  // ── Timer state ──
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // stopwatch seconds
  const [countdownTarget, setCountdownTarget] = useState(45); // minutes
  const [countdownLeft, setCountdownLeft] = useState(45 * 60);
  const [pomPhase, setPomPhase] = useState<PomodoroPhase>("focus");
  const [pomLeft, setPomLeft] = useState(POMODORO.focus);
  const [pomSessions, setPomSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // ── Focus mode (distraction-free) ──
  const [focusUI, setFocusUI] = useState(false);

  // ── Daily goal ──
  const [dailyGoalHours, setDailyGoalHours] = useState(4);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(4);

  // ── Streak ──
  const streak = getStudyStreak();

  // ── History ──
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [subjectStats, setSubjectStats] = useState<{ name: string; minutes: number; color: string }[]>([]);

  // ── Note after session ──
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [sessionNote, setSessionNote] = useState("");
  const pendingDuration = useRef(0);

  // ── Heatmap data ──
  const studyDatesSet = useMemo(() => new Set(getStudyDates()), []);

  // ── Load data ──
  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {});
    getDailyGoal().then(setDailyGoalHours).catch(() => {});
    getTodayStudyMinutes().then(setTodayMinutes).catch(() => {});
    loadHistory();
  }, []);

  async function loadHistory() {
    const { data } = await supabase
      .from("study_logs")
      .select("*")
      .order("logged_at", { ascending: false })
      .limit(50);
    setHistory((data || []) as SessionRecord[]);

    // Subject stats
    const subs = await getSubjects();
    const { data: allLogs } = await supabase.from("study_logs").select("subject_id, duration_minutes");
    const map = new Map<string, number>();
    (allLogs || []).forEach((l: any) => {
      if (l.subject_id) map.set(l.subject_id, (map.get(l.subject_id) || 0) + l.duration_minutes);
    });
    const stats = subs
      .filter(s => map.has(s.id))
      .map(s => ({ name: s.code || s.name, minutes: map.get(s.id)!, color: s.color }));
    setSubjectStats(stats);
  }

  // ── Browser tab title ──
  useEffect(() => {
    if (!running) {
      document.title = "SPPU Study";
      return;
    }
    const label = mode === "stopwatch" ? fmt(elapsed) : mode === "countdown" ? fmt(countdownLeft) : fmt(pomLeft);
    document.title = `${label} — Study Timer`;
    return () => { document.title = "SPPU Study"; };
  }, [running, elapsed, countdownLeft, pomLeft, mode]);

  // ── Clear interval helper ──
  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // ── Tick ──
  useEffect(() => {
    if (!running) { clearTimer(); return; }

    if (mode === "stopwatch") {
      startTimeRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else if (mode === "countdown") {
      intervalRef.current = setInterval(() => {
        setCountdownLeft(prev => {
          if (prev <= 1) {
            clearTimer(); setRunning(false); playBell();
            toast.success("Countdown complete!");
            finishSession(countdownTarget);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // pomodoro
      intervalRef.current = setInterval(() => {
        setPomLeft(prev => {
          if (prev <= 1) {
            clearTimer(); setRunning(false); playBell();
            if (pomPhase === "focus") {
              const next = pomSessions + 1;
              setPomSessions(next);
              finishSession(25);
              awardXP("focus_session").then(a => { if (a > 0) toast.success(`+${a} XP!`); });
              if (next % 4 === 0) {
                setPomPhase("long-break"); return POMODORO["long-break"];
              } else {
                setPomPhase("short-break"); return POMODORO["short-break"];
              }
            } else {
              setPomPhase("focus");
              toast.info("Break over! Time to focus.");
              return POMODORO.focus;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return clearTimer;
  }, [running, mode]);

  // ── Finish session ──
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
    setShowNoteDialog(false);
    setSessionNote("");
    loadHistory();
    getTodayStudyMinutes().then(setTodayMinutes);
  }

  // ── Stop stopwatch ──
  function stopStopwatch() {
    clearTimer();
    setRunning(false);
    const mins = Math.max(1, Math.round(elapsed / 60));
    finishSession(mins);
    setElapsed(0);
  }

  // ── Mode switch ──
  function switchMode(m: TimerMode) {
    clearTimer(); setRunning(false);
    setMode(m);
    if (m === "stopwatch") setElapsed(0);
    if (m === "countdown") setCountdownLeft(countdownTarget * 60);
    if (m === "pomodoro") { setPomPhase("focus"); setPomLeft(POMODORO.focus); setPomSessions(0); }
  }

  // ── Save goal ──
  async function handleSaveGoal() {
    await setDailyGoal(goalInput);
    setDailyGoalHours(goalInput);
    setEditGoal(false);
    toast.success("Daily goal updated!");
  }

  // ── Timer display value ──
  const displayTime = mode === "stopwatch" ? fmt(elapsed) : mode === "countdown" ? fmt(countdownLeft) : fmt(pomLeft);
  const timerProgress = mode === "stopwatch"
    ? 0
    : mode === "countdown"
    ? (countdownLeft / (countdownTarget * 60))
    : (pomLeft / POMODORO[pomPhase]);
  const goalPercent = Math.min(100, Math.round((todayMinutes / (dailyGoalHours * 60)) * 100));

  // ── Heatmap ──
  const heatmapData = useMemo(() => {
    const result: { date: string; active: boolean }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      result.push({ date: ds, active: studyDatesSet.has(ds) });
    }
    return result;
  }, [studyDatesSet]);

  // ── Focus mode UI ──
  if (focusUI) {
    return (
      <div className="fixed inset-0 bg-background z-[100] flex flex-col items-center justify-center">
        <button onClick={() => setFocusUI(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <Minimize2 className="w-5 h-5" />
        </button>
        <p className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
          {mode === "pomodoro" ? (pomPhase === "focus" ? "Focus" : pomPhase === "short-break" ? "Short Break" : "Long Break") : mode}
        </p>
        <span className="text-7xl sm:text-8xl font-bold font-mono text-foreground">{displayTime}</span>
        {selectedSubject !== "none" && (
          <p className="text-sm text-muted-foreground mt-3">{subjects.find(s => s.id === selectedSubject)?.name}</p>
        )}
        <div className="flex items-center gap-3 mt-8">
          {mode === "stopwatch" && running && (
            <Button variant="destructive" size="lg" onClick={stopStopwatch} className="rounded-full gap-2">
              <Square className="w-4 h-4" /> Stop & Save
            </Button>
          )}
          {mode !== "stopwatch" && (
            <Button size="lg" onClick={() => setRunning(!running)} className="rounded-full px-10 gap-2">
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? "Pause" : "Start"}
            </Button>
          )}
          {mode === "stopwatch" && !running && (
            <Button size="lg" onClick={() => { setElapsed(0); setRunning(true); }} className="rounded-full px-10 gap-2">
              <Play className="w-4 h-4" /> Start
            </Button>
          )}
        </div>
        <NoteDialog open={showNoteDialog} note={sessionNote} setNote={setSessionNote} onSave={saveSession} onSkip={() => saveSession("")} />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Study Timer</h1>
            <p className="text-sm text-muted-foreground">Track, focus, and improve your study sessions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFocusUI(true)} className="gap-1.5">
            <Maximize2 className="w-4 h-4" /> Focus Mode
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column: Timer ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Subject selector + mode tabs */}
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger><SelectValue placeholder="No subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No subject</SelectItem>
                        {subjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {mode === "countdown" && (
                    <div className="w-32">
                      <Label className="text-xs text-muted-foreground mb-1 block">Duration (min)</Label>
                      <Input
                        type="number" min={1} max={180} value={countdownTarget}
                        onChange={e => {
                          const v = parseInt(e.target.value) || 1;
                          setCountdownTarget(v);
                          if (!running) setCountdownLeft(v * 60);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Mode tabs */}
                <Tabs value={mode} onValueChange={v => switchMode(v as TimerMode)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="stopwatch" className="gap-1.5"><Timer className="w-3.5 h-3.5" /> Stopwatch</TabsTrigger>
                    <TabsTrigger value="countdown" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> Countdown</TabsTrigger>
                    <TabsTrigger value="pomodoro" className="gap-1.5"><Brain className="w-3.5 h-3.5" /> Pomodoro</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Pomodoro phase pills */}
                {mode === "pomodoro" && (
                  <div className="flex gap-1.5 justify-center">
                    {(["focus", "short-break", "long-break"] as PomodoroPhase[]).map(p => (
                      <button key={p} onClick={() => {
                        clearTimer(); setRunning(false); setPomPhase(p); setPomLeft(POMODORO[p]);
                      }} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        pomPhase === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}>
                        {p === "focus" ? "Focus" : p === "short-break" ? "Short Break" : "Long Break"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Circular timer */}
                <div className="flex flex-col items-center py-6">
                  <div className="relative w-56 h-56">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                      {mode !== "stopwatch" && (
                        <motion.circle
                          cx="100" cy="100" r="90" fill="none"
                          stroke={pomPhase !== "focus" && mode === "pomodoro" ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                          strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 90}
                          animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - timerProgress) }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold font-mono text-foreground">{displayTime}</span>
                      <span className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
                        {mode === "pomodoro" && pomPhase !== "focus" ? <Coffee className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                        {mode === "pomodoro" ? (pomPhase === "focus" ? "Focus" : pomPhase === "short-break" ? "Short Break" : "Long Break") : mode === "stopwatch" ? "Stopwatch" : "Countdown"}
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3 mt-6">
                    {mode === "stopwatch" ? (
                      <>
                        {!running && elapsed === 0 && (
                          <Button size="lg" onClick={() => setRunning(true)} className="rounded-full px-10 gap-2">
                            <Play className="w-4 h-4" /> Start
                          </Button>
                        )}
                        {running && (
                          <>
                            <Button variant="outline" size="lg" onClick={() => setRunning(false)} className="rounded-full gap-2">
                              <Pause className="w-4 h-4" /> Pause
                            </Button>
                            <Button variant="destructive" size="lg" onClick={stopStopwatch} className="rounded-full gap-2">
                              <Square className="w-4 h-4" /> Stop
                            </Button>
                          </>
                        )}
                        {!running && elapsed > 0 && (
                          <>
                            <Button size="lg" onClick={() => setRunning(true)} className="rounded-full gap-2">
                              <Play className="w-4 h-4" /> Resume
                            </Button>
                            <Button variant="destructive" size="lg" onClick={stopStopwatch} className="rounded-full gap-2">
                              <Square className="w-4 h-4" /> Save
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setElapsed(0)} className="rounded-full">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="icon" onClick={() => {
                          clearTimer(); setRunning(false);
                          if (mode === "countdown") setCountdownLeft(countdownTarget * 60);
                          if (mode === "pomodoro") setPomLeft(POMODORO[pomPhase]);
                        }} className="rounded-full"><RotateCcw className="w-4 h-4" /></Button>
                        <Button size="lg" onClick={() => setRunning(!running)} className="rounded-full px-10 gap-2">
                          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {running ? "Pause" : "Start"}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Pomodoro session dots */}
                  {mode === "pomodoro" && (
                    <div className="flex items-center gap-2 mt-4">
                      {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < (pomSessions % 4) ? "bg-primary" : "bg-secondary"}`} />
                      ))}
                      <span className="text-[10px] font-mono text-muted-foreground ml-1">{pomSessions} sessions</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* History + Analytics tabs */}
            <Card>
              <Tabs defaultValue="history">
                <CardHeader className="pb-2">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="history" className="gap-1.5"><History className="w-3.5 h-3.5" /> History</TabsTrigger>
                    <TabsTrigger value="subjects" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> By Subject</TabsTrigger>
                    <TabsTrigger value="heatmap" className="gap-1.5"><Flame className="w-3.5 h-3.5" /> Heatmap</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="history" className="mt-0">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No sessions yet. Start studying!</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {history.map(h => {
                          const sub = subjects.find(s => s.id === h.subject_id);
                          const date = new Date(h.logged_at);
                          return (
                            <div key={h.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {h.duration_minutes} min {sub ? `· ${sub.code}` : ""}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{h.duration_minutes}m</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="subjects" className="mt-0">
                    {subjectStats.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No subject data yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={subjectStats}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} label={{ value: "mins", angle: -90, position: "insideLeft", fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => `${v} min`} />
                          <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                            {subjectStats.map((s, i) => (
                              <Cell key={i} fill={`hsl(var(--${s.color}))`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </TabsContent>
                  <TabsContent value="heatmap" className="mt-0">
                    <div className="flex flex-wrap gap-1 justify-center py-4">
                      {heatmapData.map((d, i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-sm ${d.active ? "bg-primary" : "bg-secondary"}`}
                          title={`${d.date}: ${d.active ? "Studied" : "No activity"}`}
                        />
                      ))}
                    </div>
                    <p className="text-center text-xs text-muted-foreground font-mono">Last 12 weeks</p>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* ── Right column: Stats ── */}
          <div className="space-y-4">
            {/* Daily Goal */}
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
                    <div className="flex-1">
                      <Label className="text-xs">Target (hours)</Label>
                      <Input type="number" min={0.5} max={16} step={0.5} value={goalInput} onChange={e => setGoalInput(parseFloat(e.target.value) || 1)} />
                    </div>
                    <Button size="sm" onClick={handleSaveGoal}>Save</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Streak */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Flame className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{streak}</p>
                    <p className="text-xs text-muted-foreground">Day Streak 🔥</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Today's Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sessions today</span>
                  <span className="font-medium text-foreground">
                    {history.filter(h => new Date(h.logged_at).toDateString() === new Date().toDateString()).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total study time</span>
                  <span className="font-medium text-foreground">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</span>
                </div>
                {mode === "pomodoro" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pomodoro sessions</span>
                    <span className="font-medium text-foreground">{pomSessions}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <Volume2 className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    A bell will ring when your countdown or pomodoro timer ends. The timer also shows in your browser tab!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Note dialog */}
      <NoteDialog open={showNoteDialog} note={sessionNote} setNote={setSessionNote} onSave={saveSession} onSkip={() => saveSession("")} />
    </AppLayout>
  );
}

function NoteDialog({ open, note, setNote, onSave, onSkip }: {
  open: boolean; note: string; setNote: (v: string) => void; onSave: (n: string) => void; onSkip: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><StickyNote className="w-4 h-4" /> Session Note</DialogTitle>
        </DialogHeader>
        <Textarea placeholder="What did you cover? (optional)" value={note} onChange={e => setNote(e.target.value)} rows={3} />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          <Button size="sm" onClick={() => onSave(note)}>Save Session</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
