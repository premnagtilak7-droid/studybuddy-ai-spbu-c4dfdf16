import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type Phase = "focus" | "short-break" | "long-break";

const DURATIONS: Record<Phase, number> = {
  "focus": 25 * 60,
  "short-break": 5 * 60,
  "long-break": 15 * 60,
};

const PHASE_LABELS: Record<Phase, string> = {
  "focus": "Focus",
  "short-break": "Short Break",
  "long-break": "Long Break",
};

export default function PomodoroTimer() {
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS["focus"]);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = DURATIONS[phase];
  const progress = secondsLeft / total;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!running) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);

          // Advance phase
          if (phase === "focus") {
            const newSessions = sessions + 1;
            setSessions(newSessions);
            if (newSessions % 4 === 0) {
              setPhase("long-break");
              return DURATIONS["long-break"];
            } else {
              setPhase("short-break");
              return DURATIONS["short-break"];
            }
          } else {
            setPhase("focus");
            return DURATIONS["focus"];
          }
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [running, phase, sessions, clearTimer]);

  const handleReset = () => {
    clearTimer();
    setRunning(false);
    setSecondsLeft(DURATIONS[phase]);
  };

  const handlePhaseSwitch = (p: Phase) => {
    clearTimer();
    setRunning(false);
    setPhase(p);
    setSecondsLeft(DURATIONS[p]);
  };

  const phaseColor: Record<Phase, string> = {
    "focus": "hsl(var(--primary))",
    "short-break": "hsl(var(--success))",
    "long-break": "hsl(var(--accent))",
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Pomodoro Timer
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Session {sessions + 1} · {PHASE_LABELS[phase]}
          </p>
        </div>
        <div className="flex gap-1">
          {(["focus", "short-break", "long-break"] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePhaseSwitch(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                phase === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {p === "focus" ? "Focus" : p === "short-break" ? "Short" : "Long"}
            </button>
          ))}
        </div>
      </div>

      {/* Circular timer */}
      <div className="flex flex-col items-center py-4">
        <div className="relative w-52 h-52">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="8"
            />
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={phaseColor[phase]}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold font-mono text-foreground">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1">
              {phase === "focus" ? (
                <Brain className="w-3 h-3" />
              ) : (
                <Coffee className="w-3 h-3" />
              )}
              {PHASE_LABELS[phase]}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="rounded-full"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="lg"
            onClick={() => setRunning(!running)}
            className="rounded-full px-8 gap-2"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? "Pause" : "Start"}
          </Button>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-2 mt-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < (sessions % 4) ? "bg-primary" : "bg-secondary"
              }`}
            />
          ))}
          <span className="text-[10px] font-mono text-muted-foreground ml-1">
            {sessions} completed
          </span>
        </div>
      </div>
    </div>
  );
}
