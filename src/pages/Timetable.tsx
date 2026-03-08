import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Check, Lock, AlertTriangle } from "lucide-react";
import AppLayout from "../components/AppLayout";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = ["6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"];

type Session = {
  subject: string;
  time: string;
  duration: string;
  completed: boolean;
  color: string;
};

const mockSchedule: Record<string, Session[]> = {
  Monday: [
    { subject: "Maths II", time: "8:00 AM", duration: "2h", completed: true, color: "chart-3" },
    { subject: "BEE", time: "2:00 PM", duration: "1.5h", completed: false, color: "chart-1" },
  ],
  Tuesday: [
    { subject: "Mechanics", time: "10:00 AM", duration: "2h", completed: false, color: "chart-2" },
    { subject: "Chemistry", time: "4:00 PM", duration: "1h", completed: false, color: "chart-4" },
  ],
  Wednesday: [
    { subject: "BEE", time: "8:00 AM", duration: "2h", completed: true, color: "chart-1" },
    { subject: "Workshop", time: "2:00 PM", duration: "3h", completed: true, color: "chart-5" },
  ],
  Thursday: [
    { subject: "Maths II", time: "6:00 AM", duration: "1.5h", completed: false, color: "chart-3" },
    { subject: "Mechanics", time: "4:00 PM", duration: "2h", completed: false, color: "chart-2" },
  ],
  Friday: [
    { subject: "BEE", time: "10:00 AM", duration: "2h", completed: false, color: "chart-1" },
    { subject: "Chemistry", time: "6:00 PM", duration: "1.5h", completed: false, color: "chart-4" },
  ],
  Saturday: [
    { subject: "Revision", time: "8:00 AM", duration: "3h", completed: false, color: "chart-2" },
  ],
  Sunday: [
    { subject: "Practice Problems", time: "10:00 AM", duration: "2h", completed: false, color: "chart-3" },
  ],
};

export default function Timetable() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [summaryModal, setSummaryModal] = useState<number | null>(null);
  const [summary, setSummary] = useState("");

  // Mark timetable as visited for Getting Started checklist
  useState(() => { localStorage.setItem("sppu_timetable_visited", "1"); });

  const sessions = mockSchedule[selectedDay] || [];

  const handleComplete = (idx: number) => {
    setSummaryModal(idx);
    setSummary("");
  };

  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const sentenceCount = summary.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const canSubmit = sentenceCount >= 3;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Smart Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">Weekly recurring scheduler with Strict Mode</p>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedDay === d
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Sessions */}
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-4 flex items-center justify-between border-l-4`}
              style={{ borderLeftColor: `hsl(var(--${session.color}))` }}
            >
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <Clock className="w-4 h-4 text-muted-foreground mx-auto" />
                  <p className="text-xs font-mono text-muted-foreground mt-1">{session.time}</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{session.subject}</p>
                  <p className="text-xs font-mono text-muted-foreground">{session.duration} session</p>
                </div>
              </div>

              {session.completed ? (
                <span className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-3 py-1.5 rounded-lg">
                  <Check className="w-3 h-3" /> Completed
                </span>
              ) : (
                <button
                  onClick={() => handleComplete(i)}
                  className="flex items-center gap-1 text-xs font-medium gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Lock className="w-3 h-3" /> Mark Complete
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Strict Mode Info */}
        <div className="glass-card p-4 border-l-4 border-l-accent">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">Strict Mode Active</h4>
              <p className="text-xs text-muted-foreground mt-1">
                To mark a session complete, you must write a mandatory summary with at least 3 sentences
                describing what you learned. This ensures active recall and better retention.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Modal */}
        {summaryModal !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSummaryModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="glass-card p-6 max-w-lg w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-foreground text-lg">Mandatory Summary</h3>
              <p className="text-sm text-muted-foreground">
                Write at least <strong>3 sentences</strong> about what you learned in this session.
              </p>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                placeholder="I learned about Star-Delta transformation and its application in circuit analysis. The key insight was..."
              />
              <div className="flex items-center justify-between">
                <p className={`text-xs font-mono ${canSubmit ? "text-success" : "text-muted-foreground"}`}>
                  {sentenceCount}/3 sentences · {wordCount} words
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSummaryModal(null)}
                    className="px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!canSubmit}
                    onClick={() => setSummaryModal(null)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                      canSubmit
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    Submit & Complete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
