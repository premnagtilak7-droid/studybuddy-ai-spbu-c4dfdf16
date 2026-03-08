import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { awardXP, emitXP } from "@/lib/xp-store";
import { toast } from "sonner";
import { Play, Pause, RotateCcw, Brain, Zap, Clock, Flame } from "lucide-react";

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
  "The way to get started is to quit talking and begin doing. – Walt Disney",
  "Success is the sum of small efforts, repeated day in and day out. – Robert Collier",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
];

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      completeSession();
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  async function loadStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: todayData } = await supabase.from("focus_sessions").select("duration_minutes").eq("user_id", user!.id).eq("completed", true).gte("created_at", today.toISOString());
    setTodayMinutes((todayData || []).reduce((a, s) => a + s.duration_minutes, 0));
    const { data: weekData } = await supabase.from("focus_sessions").select("duration_minutes").eq("user_id", user!.id).eq("completed", true).gte("created_at", weekAgo.toISOString());
    setWeekMinutes((weekData || []).reduce((a, s) => a + s.duration_minutes, 0));
  }

  async function completeSession() {
    setIsRunning(false);
    setIsComplete(true);
    // Play sound
    try {
      audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoGBgoJ9eXV1fIF9d3J0en6Af317eHh7fX5+fXx7e3t8fX5+fn19fX19fn5+fn19fX19fn5+fn19fX19");
      audioRef.current.play().catch(() => {});
    } catch {}
    // Save session
    await supabase.from("focus_sessions").insert({ user_id: user!.id, duration_minutes: selectedDuration, completed: true, notes: parkingLot || null });
    // Award XP
    try {
      const amount = await awardXP("focus_session");
      if (amount > 0) emitXP(amount, "Focus session complete!");
    } catch {}
    toast.success(`${selectedDuration} min focus session complete! 🎉`);
    loadStats();
  }

  function startTimer() {
    setIsRunning(true);
    setIsComplete(false);
  }

  function pauseTimer() { setIsRunning(false); }

  function resetTimer() {
    setIsRunning(false);
    setIsComplete(false);
    setTimeLeft(selectedDuration * 60);
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

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div><h1 className="text-2xl font-bold text-foreground">Focus Mode</h1><p className="text-muted-foreground text-sm">Deep work with zero distractions</p></div>

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

        {/* Duration Selector */}
        {!isRunning && !isComplete && (
          <div className="flex gap-2 justify-center">
            {DURATIONS.map(d => (
              <Button key={d.value} variant={selectedDuration === d.value ? "default" : "outline"} size="sm" onClick={() => selectDuration(d.value)}>
                {d.label}
              </Button>
            ))}
          </div>
        )}

        {/* Timer */}
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

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {!isRunning && !isComplete && <Button onClick={startTimer} size="lg"><Play className="w-5 h-5 mr-2" />Start Focus</Button>}
          {isRunning && <Button onClick={pauseTimer} variant="outline" size="lg"><Pause className="w-5 h-5 mr-2" />Pause</Button>}
          {(isRunning || isComplete) && <Button onClick={resetTimer} variant="outline" size="lg"><RotateCcw className="w-5 h-5 mr-2" />Reset</Button>}
        </div>

        {/* Motivational Quote */}
        {isRunning && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 text-center">
              <Brain className="w-5 h-5 mx-auto text-primary mb-2" />
              <p className="text-sm italic text-foreground">"{quote}"</p>
            </CardContent>
          </Card>
        )}

        {/* Parking Lot */}
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
