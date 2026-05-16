import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { awardXP } from "@/lib/xp-store";
import { emitXP } from "@/components/XPNotification";
import { toast } from "sonner";
import {
  Play, Pause, RotateCcw, Brain, Clock, Flame, Shield, Maximize2,
  AlertTriangle, X,
} from "lucide-react";

const DURATIONS = [
  { label: "25 min", value: 25 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
];

const QUOTES = [
  "The secret of getting ahead is getting started. – Mark Twain",
  "It does not matter how slowly you go as long as you do not stop. – Confucius",
  "Focus on being productive instead of busy. – Tim Ferriss",
  "Great things never come from comfort zones.",
  "Push yourself, because no one else is going to do it for you.",
];

const DISTRACTION_PENALTY = 10;
const CLEAN_BONUS = 25;

export default function FocusMode() {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [parkingLot, setParkingLot] = useState("");
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekMinutes, setWeekMinutes] = useState(0);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  // Strict mode state
  const [strictMode, setStrictMode] = useState(true);
  const [currentTask, setCurrentTask] = useState("");
  const [distractions, setDistractions] = useState(0);
  const [showDistractionWarning, setShowDistractionWarning] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [summary, setSummary] = useState<{ distractions: number; bonus: number; penalty: number } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isRunningRef = useRef(false);
  const strictRef = useRef(true);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { strictRef.current = strictMode; }, [strictMode]);

  useEffect(() => { loadStats(); }, []);

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      completeSession();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  // Tab-leave detection + beforeunload + popstate block (only while running in strict mode)
  useEffect(() => {
    if (!isRunning || !strictMode) return;

    const onVisibility = () => {
      if (document.hidden && isRunningRef.current) {
        // pause + count distraction
        setIsRunning(false);
        setDistractions(d => d + 1);
        setShowDistractionWarning(true);
        // deduct XP (negative amount logged with custom reason)
        awardXP("focus_session", -DISTRACTION_PENALTY).catch(() => {});
        try {
          new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoGBgoJ9eXV1fIF9d3J0en6Af317eHh7fX5+fXx7e3t8fX5+fn19fX19fn5+fn19fX19fn5+fn19fX19").play().catch(() => {});
        } catch {}
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Session in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    // Block back button
    window.history.pushState({ focusLock: true }, "");
    const onPopState = () => {
      if (isRunningRef.current && strictRef.current) {
        window.history.pushState({ focusLock: true }, "");
        setShowStopConfirm(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [isRunning, strictMode]);

  async function loadStats() {
    if (!user) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: todayData } = await supabase.from("focus_sessions").select("duration_minutes").eq("user_id", user.id).eq("completed", true).gte("created_at", today.toISOString());
    setTodayMinutes((todayData || []).reduce((a, s) => a + s.duration_minutes, 0));
    const { data: weekData } = await supabase.from("focus_sessions").select("duration_minutes").eq("user_id", user.id).eq("completed", true).gte("created_at", weekAgo.toISOString());
    setWeekMinutes((weekData || []).reduce((a, s) => a + s.duration_minutes, 0));
  }

  async function completeSession() {
    setIsRunning(false);
    setIsComplete(true);
    try {
      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoGBgoJ9eXV1fIF9d3J0en6Af317eHh7fX5+fXx7e3t8fX5+fn19fX19fn5+fn19fX19fn5+fn19fX19");
      audioRef.current.play().catch(() => {});
    } catch {}

    await supabase.from("focus_sessions").insert({
      user_id: user!.id,
      duration_minutes: selectedDuration,
      completed: true,
      notes: parkingLot || currentTask || null,
      distractions,
    } as any);

    // Base XP
    let bonus = 0;
    const penalty = distractions * DISTRACTION_PENALTY;
    try {
      const base = await awardXP("focus_session");
      if (base > 0) emitXP(base, "Focus session complete!");
      if (distractions === 0) {
        bonus = await awardXP("focus_session", CLEAN_BONUS);
        if (bonus > 0) emitXP(bonus, "Clean session bonus! 🎯");
      }
    } catch {}

    setSummary({ distractions, bonus, penalty });
    exitFullscreen();
    toast.success(`${selectedDuration} min focus session complete! 🎉`);
    loadStats();
  }

  async function enterFullscreen() {
    try {
      if (wrapperRef.current && wrapperRef.current.requestFullscreen) {
        await wrapperRef.current.requestFullscreen();
      }
    } catch {}
  }

  function exitFullscreen() {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  }

  async function startTimer() {
    setIsRunning(true);
    setIsComplete(false);
    setDistractions(0);
    setSummary(null);
    if (strictMode) await enterFullscreen();
  }

  function pauseTimer() { setIsRunning(false); }

  function resetTimer() {
    setIsRunning(false);
    setIsComplete(false);
    setTimeLeft(selectedDuration * 60);
    setDistractions(0);
    exitFullscreen();
  }

  function confirmStop() {
    setIsRunning(false);
    setShowStopConfirm(false);
    exitFullscreen();
    toast.info("Session stopped");
  }

  function resumeFromDistraction() {
    setShowDistractionWarning(false);
    setIsRunning(true);
  }

  function selectDuration(mins: number) {
    setSelectedDuration(mins);
    setTimeLeft(mins * 60);
    setIsRunning(false);
    setIsComplete(false);
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const lockedActive = isRunning && strictMode;

  // === Strict Fullscreen overlay ===
  if (lockedActive) {
    return (
      <div
        ref={wrapperRef}
        className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 overflow-hidden"
      >
        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Badge variant="secondary" className="gap-1.5">
            <Shield className="w-3 h-3" /> Strict Focus Mode
          </Badge>
          <Badge
            variant={distractions === 0 ? "outline" : "destructive"}
            className="gap-1.5"
          >
            <AlertTriangle className="w-3 h-3" /> Distractions: {distractions}
          </Badge>
        </div>

        {/* Current task */}
        {currentTask && (
          <p className="text-sm text-muted-foreground mb-2">Working on</p>
        )}
        {currentTask && (
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-8 text-center max-w-xl">
            {currentTask}
          </h2>
        )}

        {/* Timer ring */}
        <div className="relative w-72 h-72 md:w-80 md:h-80">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-6xl md:text-7xl font-mono font-bold text-foreground tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{selectedDuration} min session</p>
          </div>
        </div>

        <p className="text-xs italic text-muted-foreground mt-8 text-center max-w-md">"{quote}"</p>

        <Button
          variant="ghost"
          size="sm"
          className="mt-10 text-muted-foreground"
          onClick={() => setShowStopConfirm(true)}
        >
          <X className="w-4 h-4 mr-1" /> End session
        </Button>

        {/* Distraction warning */}
        <AlertDialog open={showDistractionWarning} onOpenChange={setShowDistractionWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> You left the session!
              </AlertDialogTitle>
              <AlertDialogDescription>
                Switching tabs or minimizing breaks deep focus. <b>-{DISTRACTION_PENALTY} XP</b> deducted.
                Total distractions this session: <b>{distractions}</b>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={resumeFromDistraction}>Resume Focus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stop confirm */}
        <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Timer is running!</AlertDialogTitle>
              <AlertDialogDescription>
                Stop session first? You will lose your in-progress focus session and won't earn XP for it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep focusing</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStop}>Stop session</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // === Normal page ===
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Focus Mode</h1>
          <p className="text-muted-foreground text-sm">Deep work with zero distractions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-4 text-center">
            <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{Math.round(todayMinutes / 60 * 10) / 10}h</p>
            <p className="text-xs text-muted-foreground">Focus Today</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Flame className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-xl font-bold text-foreground">{Math.round(weekMinutes / 60 * 10) / 10}h</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </CardContent></Card>
        </div>

        {/* Strict mode toggle */}
        <Card className="border-primary/30">
          <CardContent className="pt-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Strict Focus Mode</p>
                <p className="text-xs text-muted-foreground">
                  Fullscreen takeover, blocks nav, pauses on tab-leave, -{DISTRACTION_PENALTY} XP per distraction,
                  +{CLEAN_BONUS} XP bonus for clean sessions.
                </p>
              </div>
            </div>
            <Switch checked={strictMode} onCheckedChange={setStrictMode} disabled={isRunning} />
          </CardContent>
        </Card>

        {/* Current task input */}
        {!isRunning && !isComplete && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What are you working on?</label>
            <Input
              value={currentTask}
              onChange={e => setCurrentTask(e.target.value)}
              placeholder="e.g. Revise Unit 3 - Data Structures"
              maxLength={120}
            />
          </div>
        )}

        {/* Duration */}
        {!isRunning && !isComplete && (
          <div className="flex gap-2 justify-center flex-wrap">
            {DURATIONS.map(d => (
              <Button key={d.value} variant={selectedDuration === d.value ? "default" : "outline"} size="sm" onClick={() => selectDuration(d.value)}>
                {d.label}
              </Button>
            ))}
          </div>
        )}

        {/* Timer ring (non-strict / paused view) */}
        <div className="flex justify-center">
          <div className="relative w-64 h-64">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="130" cy="130" r="120" fill="none" stroke={isComplete ? "hsl(var(--success))" : "hsl(var(--primary))"} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isComplete ? (
                <div className="text-center">
                  <p className="text-3xl">🎉</p>
                  <p className="text-sm font-medium text-success mt-1">Complete!</p>
                </div>
              ) : (
                <>
                  <p className="text-4xl font-mono font-bold text-foreground">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedDuration} min session</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Distractions live (when paused mid-session, non-strict) */}
        {distractions > 0 && !isComplete && (
          <div className="flex justify-center">
            <Badge variant="destructive" className="gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Distractions: {distractions}
            </Badge>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 justify-center flex-wrap">
          {!isRunning && !isComplete && (
            <Button onClick={startTimer} size="lg">
              {strictMode ? <Maximize2 className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {strictMode ? "Start Strict Focus" : "Start Focus"}
            </Button>
          )}
          {isRunning && !strictMode && <Button onClick={pauseTimer} variant="outline" size="lg"><Pause className="w-5 h-5 mr-2" />Pause</Button>}
          {(isRunning || isComplete) && <Button onClick={resetTimer} variant="outline" size="lg"><RotateCcw className="w-5 h-5 mr-2" />Reset</Button>}
        </div>

        {/* Session summary */}
        {summary && (
          <Card className={summary.distractions === 0 ? "border-success/40 bg-success/5" : "border-destructive/30 bg-destructive/5"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {summary.distractions === 0 ? "🎯 Clean Session!" : "Session Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>You left <b>{summary.distractions}</b> time{summary.distractions === 1 ? "" : "s"} during this session.</p>
              {summary.distractions === 0 ? (
                <p className="text-success">Clean session bonus: <b>+{CLEAN_BONUS} XP</b> 🎉</p>
              ) : (
                <p className="text-destructive">XP lost to distractions: <b>-{summary.penalty} XP</b></p>
              )}
              <p className="text-xs text-muted-foreground pt-1">Clean session = 0 distractions. Aim for it next time.</p>
            </CardContent>
          </Card>
        )}

        {/* Quote */}
        {isRunning && !strictMode && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 text-center">
              <Brain className="w-5 h-5 mx-auto text-primary mb-2" />
              <p className="text-sm italic text-foreground">"{quote}"</p>
            </CardContent>
          </Card>
        )}

        {/* Parking lot */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" />Parking Lot</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Dump distracting thoughts here and get back to focus</p>
            <Textarea value={parkingLot} onChange={e => setParkingLot(e.target.value)} placeholder="That thing I need to remember later..." rows={4} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
