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
  AlertTriangle, X, Ban, Smartphone, Apple, Settings,
} from "lucide-react";
import {
  detectSupport, hasUsageAccess, openUsageAccessSettings, startBlocking,
  BLOCKED_APPS, type BlockedAttempt,
} from "@/lib/focus-block";

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
  const [summary, setSummary] = useState<{
    distractions: number; bonus: number; penalty: number; attempts: BlockedAttempt[];
  } | null>(null);

  // Focus Block (native app blocking) state
  const platform = useRef(detectSupport()).current;
  const [focusBlock, setFocusBlock] = useState(platform === "native-android");
  const [usagePermission, setUsagePermission] = useState(false);
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);
  const [blockedAttempts, setBlockedAttempts] = useState<BlockedAttempt[]>([]);
  const [blockedOverlay, setBlockedOverlay] = useState<BlockedAttempt | null>(null);
  const [quitInput, setQuitInput] = useState("");
  const blockStopRef = useRef<null | (() => Promise<void>)>(null);
  const iosCardDismissed = (typeof localStorage !== "undefined" &&
    localStorage.getItem("ios_screentime_card_dismissed") === "1");
  const [showIosCard, setShowIosCard] = useState(
    platform === "ios-fallback" && !iosCardDismissed
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isRunningRef = useRef(false);
  const strictRef = useRef(true);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { strictRef.current = strictMode; }, [strictMode]);

  useEffect(() => { loadStats(); refreshPermission(); }, []);

  async function refreshPermission() {
    if (platform === "native-android") setUsagePermission(await hasUsageAccess());
  }

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
        setIsRunning(false);
        setDistractions(d => d + 1);
        setShowDistractionWarning(true);
        awardXP("focus_session", -DISTRACTION_PENALTY).catch(() => {});
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Session in progress. Are you sure you want to leave?";
      return e.returnValue;
    };
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

  async function stopNativeBlocking() {
    if (blockStopRef.current) {
      try { await blockStopRef.current(); } catch {}
      blockStopRef.current = null;
    }
  }

  async function completeSession() {
    setIsRunning(false);
    setIsComplete(true);
    await stopNativeBlocking();
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
      blocked_attempts: blockedAttempts as any,
    } as any);

    let bonus = 0;
    const penalty = distractions * DISTRACTION_PENALTY;
    try {
      const base = await awardXP("focus_session");
      if (base > 0) emitXP(base, "Focus session complete!");
      if (distractions === 0 && blockedAttempts.length === 0) {
        bonus = await awardXP("focus_session", CLEAN_BONUS);
        if (bonus > 0) emitXP(bonus, "Clean session bonus! 🎯");
      }
    } catch {}

    setSummary({ distractions, bonus, penalty, attempts: blockedAttempts });
    exitFullscreen();
    toast.success(`${selectedDuration} min focus session complete! 🎉`);
    loadStats();
  }

  async function enterFullscreen() {
    try {
      if (wrapperRef.current?.requestFullscreen) await wrapperRef.current.requestFullscreen();
    } catch {}
  }
  function exitFullscreen() {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  }

  async function startTimer() {
    // If user wants Focus Block on Android but no permission yet, route through the permission screen.
    if (focusBlock && platform === "native-android" && !usagePermission) {
      setShowPermissionScreen(true);
      return;
    }

    setIsRunning(true);
    setIsComplete(false);
    setDistractions(0);
    setBlockedAttempts([]);
    setSummary(null);
    if (strictMode) await enterFullscreen();

    if (focusBlock && platform === "native-android" && usagePermission) {
      const { stop } = await startBlocking((e) => {
        const attempt: BlockedAttempt = { app: e.appLabel, pkg: e.packageName, at: e.timestamp };
        setBlockedAttempts(arr => [...arr, attempt]);
        setBlockedOverlay(attempt);
        awardXP("focus_session", -DISTRACTION_PENALTY).catch(() => {});
      });
      blockStopRef.current = stop;
    }
  }

  function pauseTimer() { setIsRunning(false); }
  async function resetTimer() {
    setIsRunning(false);
    setIsComplete(false);
    setTimeLeft(selectedDuration * 60);
    setDistractions(0);
    setBlockedAttempts([]);
    await stopNativeBlocking();
    exitFullscreen();
  }
  async function confirmStop() {
    setIsRunning(false);
    setShowStopConfirm(false);
    await stopNativeBlocking();
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

  async function handleGrantPermission() {
    await openUsageAccessSettings();
    // Poll for grant for ~30s in case user comes back
    let tries = 0;
    const id = setInterval(async () => {
      tries++;
      const ok = await hasUsageAccess();
      if (ok || tries > 30) {
        clearInterval(id);
        setUsagePermission(ok);
        if (ok) {
          setShowPermissionScreen(false);
          toast.success("Permission granted! Tap Start to begin a Focus Block session.");
        }
      }
    }, 1000);
  }

  function denyPermission() {
    setFocusBlock(false);
    setShowPermissionScreen(false);
    toast.info("Falling back to tab-leave detection only.");
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((selectedDuration * 60 - timeLeft) / (selectedDuration * 60)) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const lockedActive = isRunning && strictMode;

  // === Blocked-app overlay (Android native) ===
  const blockedOverlayUI = blockedOverlay && (
    <div className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur flex flex-col items-center justify-center p-6">
      <Ban className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-bold text-foreground text-center mb-2">
        🚫 Focus Mode is ON
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-1">
        <b>{blockedOverlay.app}</b> is blocked until your session ends.
      </p>
      <p className="text-xs text-muted-foreground text-center mb-8">
        Attempt logged · -{DISTRACTION_PENALTY} XP
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" onClick={() => setBlockedOverlay(null)}>
          Go Back to Studying
        </Button>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            To end early, type <b>QUIT</b> below:
          </p>
          <Input
            value={quitInput}
            onChange={e => setQuitInput(e.target.value)}
            placeholder="Type QUIT to confirm"
            className="text-center"
          />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            disabled={quitInput.trim().toUpperCase() !== "QUIT"}
            onClick={async () => {
              setQuitInput("");
              setBlockedOverlay(null);
              await confirmStop();
            }}
          >
            End Session Early
          </Button>
        </div>
      </div>
    </div>
  );

  // === Permission screen (Android) ===
  if (showPermissionScreen) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Usage Access required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                To block distracting apps, StudyBuddy needs <b>Usage Access</b> permission.
                This lets us detect when you open Instagram, YouTube, etc. during a focus
                session and bring you back to StudyBuddy.
              </p>
              <p className="text-xs text-muted-foreground">
                We only check the foreground app while a Pomodoro is running.
                We never read your messages, contacts, or browsing history.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleGrantPermission}>
                  <Settings className="w-4 h-4 mr-2" /> Open Usage Access settings
                </Button>
                <Button variant="ghost" onClick={denyPermission}>
                  Skip — use tab-leave detection only
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // === Strict Fullscreen overlay ===
  if (lockedActive) {
    return (
      <div ref={wrapperRef} className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="secondary" className="gap-1.5">
            <Shield className="w-3 h-3" /> Strict Focus
          </Badge>
          <div className="flex gap-2">
            {focusBlock && platform === "native-android" && (
              <Badge variant="outline" className="gap-1.5">
                <Ban className="w-3 h-3" /> App Block: ON
              </Badge>
            )}
            <Badge variant={distractions + blockedAttempts.length === 0 ? "outline" : "destructive"} className="gap-1.5">
              <AlertTriangle className="w-3 h-3" /> {distractions + blockedAttempts.length}
            </Badge>
          </div>
        </div>

        {currentTask && <p className="text-sm text-muted-foreground mb-2">Working on</p>}
        {currentTask && (
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-8 text-center max-w-xl">
            {currentTask}
          </h2>
        )}

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

        <Button variant="ghost" size="sm" className="mt-10 text-muted-foreground" onClick={() => setShowStopConfirm(true)}>
          <X className="w-4 h-4 mr-1" /> End session
        </Button>

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

        {blockedOverlayUI}
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

        {/* iOS Screen Time card */}
        {showIosCard && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Apple className="w-4 h-4" /> Stronger blocking on iPhone
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                Apple doesn't let apps block other apps directly. For full app blocking,
                set up <b>Screen Time → App Limits</b> for social apps during study hours:
              </p>
              <ol className="text-xs text-muted-foreground list-decimal ml-4 space-y-1">
                <li>Open <b>Settings → Screen Time</b></li>
                <li>Tap <b>App Limits → Add Limit</b></li>
                <li>Select <b>Social</b> + <b>Entertainment</b> categories</li>
                <li>Set the limit (e.g. 15 min/day) and tap <b>Add</b></li>
              </ol>
              <p className="text-xs">
                StudyBuddy will still show a fullscreen lock + track distractions while you study.
              </p>
              <Button size="sm" variant="ghost" onClick={() => {
                localStorage.setItem("ios_screentime_card_dismissed", "1");
                setShowIosCard(false);
              }}>Got it</Button>
            </CardContent>
          </Card>
        )}

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

        {/* Focus Block (Android) */}
        <Card className={focusBlock ? "border-destructive/40" : ""}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Ban className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Focus Block
                    {platform === "native-android" ? (
                      <Badge variant="outline" className="text-[10px] py-0">Android</Badge>
                    ) : platform === "ios-fallback" ? (
                      <Badge variant="outline" className="text-[10px] py-0">iOS — limited</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0">Web — limited</Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {platform === "native-android"
                      ? "Detects Instagram, YouTube, TikTok, etc. and brings you back to StudyBuddy."
                      : "Native app blocking only works in the Android build. Here, tab-leave detection is used."}
                  </p>
                </div>
              </div>
              <Switch
                checked={focusBlock}
                onCheckedChange={setFocusBlock}
                disabled={isRunning || platform !== "native-android"}
              />
            </div>
            {focusBlock && platform === "native-android" && !usagePermission && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Permission needed
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowPermissionScreen(true)}>
                  Grant
                </Button>
              </div>
            )}
            {focusBlock && platform === "native-android" && (
              <p className="text-[11px] text-muted-foreground">
                Blocked apps: {BLOCKED_APPS.map(a => a.label).filter((v,i,a)=>a.indexOf(v)===i).join(" · ")}
              </p>
            )}
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

        {/* Timer ring */}
        <div className="flex justify-center">
          <div className="relative w-64 h-64">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="130" cy="130" r="120" fill="none" stroke={isComplete ? "hsl(var(--success))" : "hsl(var(--primary))"} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isComplete ? (
                <div className="text-center"><p className="text-3xl">🎉</p><p className="text-sm font-medium text-success mt-1">Complete!</p></div>
              ) : (
                <>
                  <p className="text-4xl font-mono font-bold text-foreground">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedDuration} min session</p>
                </>
              )}
            </div>
          </div>
        </div>

        {(distractions > 0 || blockedAttempts.length > 0) && !isComplete && (
          <div className="flex justify-center gap-2">
            {distractions > 0 && (
              <Badge variant="destructive" className="gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Tab leaves: {distractions}
              </Badge>
            )}
            {blockedAttempts.length > 0 && (
              <Badge variant="destructive" className="gap-1.5">
                <Ban className="w-3 h-3" /> Blocked: {blockedAttempts.length}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          {!isRunning && !isComplete && (
            <Button onClick={startTimer} size="lg">
              {strictMode ? <Maximize2 className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {focusBlock && platform === "native-android" ? "Start Focus Block" : (strictMode ? "Start Strict Focus" : "Start Focus")}
            </Button>
          )}
          {isRunning && !strictMode && <Button onClick={pauseTimer} variant="outline" size="lg"><Pause className="w-5 h-5 mr-2" />Pause</Button>}
          {(isRunning || isComplete) && <Button onClick={resetTimer} variant="outline" size="lg"><RotateCcw className="w-5 h-5 mr-2" />Reset</Button>}
        </div>

        {summary && (
          <Card className={summary.distractions === 0 && summary.attempts.length === 0 ? "border-success/40 bg-success/5" : "border-destructive/30 bg-destructive/5"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {summary.distractions === 0 && summary.attempts.length === 0 ? "🎯 Clean Session!" : "Session Summary"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Tab-leaves: <b>{summary.distractions}</b> · Blocked-app attempts: <b>{summary.attempts.length}</b></p>
              {summary.distractions === 0 && summary.attempts.length === 0 ? (
                <p className="text-success">Clean session bonus: <b>+{CLEAN_BONUS} XP</b> 🎉</p>
              ) : (
                <p className="text-destructive">XP lost to distractions: <b>-{summary.penalty + summary.attempts.length * DISTRACTION_PENALTY} XP</b></p>
              )}
              {summary.attempts.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold mb-1">Apps you tried to open:</p>
                  <ul className="text-xs space-y-1">
                    {summary.attempts.map((a, i) => (
                      <li key={i} className="flex justify-between border-b border-border/50 pb-1">
                        <span>{a.app}</span>
                        <span className="text-muted-foreground">
                          {new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">Clean session = 0 distractions. Aim for it next time.</p>
            </CardContent>
          </Card>
        )}

        {isRunning && !strictMode && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 text-center">
              <Brain className="w-5 h-5 mx-auto text-primary mb-2" />
              <p className="text-sm italic text-foreground">"{quote}"</p>
            </CardContent>
          </Card>
        )}

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
