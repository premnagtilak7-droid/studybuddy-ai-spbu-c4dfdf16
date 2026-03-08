import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Check, Plus, MoreVertical, Pencil, Trash2, ArrowRightLeft,
  AlertTriangle, BookOpen, Beaker, Wrench, FlaskConical,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DURATIONS = ["30min", "1h", "1.5h", "2h", "2.5h", "3h"];
const SESSION_TYPES = ["Study", "Revision", "Practice", "Lab"] as const;
type SessionType = (typeof SESSION_TYPES)[number];

const SESSION_TYPE_ICONS: Record<SessionType, typeof BookOpen> = {
  Study: BookOpen,
  Revision: Beaker,
  Practice: Wrench,
  Lab: FlaskConical,
};

const TIME_OPTIONS = [
  "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM",
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM",
  "11:00 PM",
];

const STORAGE_KEY = "sppu_timetable_sessions";
const STRICT_KEY = "sppu_strict_mode";

type Session = {
  id: string;
  subject: string;
  topic: string;
  time: string;
  duration: string;
  sessionType: SessionType;
  completed: boolean;
  color: string;
};

type Schedule = Record<string, Session[]>;

function loadSchedule(): Schedule {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {} as Schedule);
}

function saveSchedule(s: Schedule) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  localStorage.setItem("sppu_timetable_visited", "1");
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Timetable() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [schedule, setSchedule] = useState<Schedule>(loadSchedule);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [strictMode, setStrictMode] = useState(() => {
    const stored = localStorage.getItem(STRICT_KEY);
    return stored === null ? true : stored === "true";
  });

  // Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [summarySession, setSummarySession] = useState<Session | null>(null);
  const [summary, setSummary] = useState("");

  // Form state
  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formTime, setFormTime] = useState("8:00 AM");
  const [formDuration, setFormDuration] = useState("1h");
  const [formType, setFormType] = useState<SessionType>("Study");

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(STRICT_KEY, String(strictMode));
  }, [strictMode]);

  const persist = useCallback((next: Schedule) => {
    setSchedule(next);
    saveSchedule(next);
  }, []);

  const sessions = schedule[selectedDay] || [];

  const resetForm = () => {
    setFormSubject("");
    setFormTopic("");
    setFormTime("8:00 AM");
    setFormDuration("1h");
    setFormType("Study");
  };

  const openAdd = () => {
    resetForm();
    setAddOpen(true);
  };

  const openEdit = (s: Session) => {
    setFormSubject(s.subject);
    setFormTopic(s.topic);
    setFormTime(s.time);
    setFormDuration(s.duration);
    setFormType(s.sessionType);
    setEditSession(s);
  };

  const getColor = (name: string) => {
    const subj = subjects.find((s) => s.name === name);
    return subj?.color || "chart-1";
  };

  const handleSave = (isEdit: boolean) => {
    if (!formSubject) {
      toast.error("Please select a subject");
      return;
    }
    const next = { ...schedule };
    if (isEdit && editSession) {
      next[selectedDay] = next[selectedDay].map((s) =>
        s.id === editSession.id
          ? { ...s, subject: formSubject, topic: formTopic, time: formTime, duration: formDuration, sessionType: formType, color: getColor(formSubject) }
          : s
      );
      setEditSession(null);
      toast.success("Session updated");
    } else {
      const newSession: Session = {
        id: genId(),
        subject: formSubject,
        topic: formTopic,
        time: formTime,
        duration: formDuration,
        sessionType: formType,
        completed: false,
        color: getColor(formSubject),
      };
      next[selectedDay] = [...(next[selectedDay] || []), newSession];
      setAddOpen(false);
      toast.success("Session added");
    }
    persist(next);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const next = { ...schedule };
    next[selectedDay] = next[selectedDay].filter((s) => s.id !== deleteId);
    persist(next);
    setDeleteId(null);
    toast.success("Session deleted");
  };

  const handleMove = (sessionId: string, targetDay: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const next = { ...schedule };
    next[selectedDay] = next[selectedDay].filter((s) => s.id !== sessionId);
    next[targetDay] = [...(next[targetDay] || []), session];
    persist(next);
    toast.success(`Moved to ${targetDay}`);
  };

  const handleComplete = (session: Session) => {
    if (strictMode) {
      setSummarySession(session);
      setSummary("");
    } else {
      toggleComplete(session.id);
    }
  };

  const toggleComplete = (id: string) => {
    const next = { ...schedule };
    next[selectedDay] = next[selectedDay].map((s) =>
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    persist(next);
    toast.success("Session marked complete!");
  };

  const submitSummary = () => {
    if (!summarySession) return;
    toggleComplete(summarySession.id);
    setSummarySession(null);
    setSummary("");
  };

  const sentenceCount = summary.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const canSubmitSummary = sentenceCount >= 3;

  // Sort sessions by time
  const sortedSessions = [...sessions].sort((a, b) => {
    const toMin = (t: string) => {
      const [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    return toMin(a.time) - toMin(b.time);
  });

  const sessionFormContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Subject</Label>
        <Select value={formSubject} onValueChange={setFormSubject}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Topic</Label>
        <Input placeholder="e.g. Kirchhoff's Laws" value={formTopic} onChange={(e) => setFormTopic(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Time</Label>
          <Select value={formTime} onValueChange={setFormTime}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={formDuration} onValueChange={setFormDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Session Type</Label>
        <Select value={formType} onValueChange={(v) => setFormType(v as SessionType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SESSION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with Strict Mode Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart Timetable</h1>
            <p className="text-sm text-muted-foreground mt-1">Weekly recurring scheduler</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
            <AlertTriangle className={`w-4 h-4 ${strictMode ? "text-accent" : "text-muted-foreground"}`} />
            <Label htmlFor="strict-mode" className="text-xs font-medium cursor-pointer select-none">
              Strict Mode
            </Label>
            <Switch id="strict-mode" checked={strictMode} onCheckedChange={setStrictMode} />
          </div>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {DAYS.map((d) => {
            const count = (schedule[d] || []).length;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all relative ${
                  selectedDay === d
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {d.slice(0, 3)}
                {count > 0 && (
                  <span className={`ml-1.5 text-[10px] font-mono ${
                    selectedDay === d ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sessions */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedSessions.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No sessions for {selectedDay}</p>
                <p className="text-xs mt-1">Click "+ Add Session" to get started</p>
              </motion.div>
            )}

            {sortedSessions.map((session, i) => {
              const TypeIcon = SESSION_TYPE_ICONS[session.sessionType] || BookOpen;
              return (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  className={`glass-card p-4 flex items-center justify-between border-l-4 ${
                    session.completed ? "opacity-60" : ""
                  }`}
                  style={{ borderLeftColor: `hsl(var(--${session.color}))` }}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="text-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-muted-foreground mx-auto" />
                      <p className="text-xs font-mono text-muted-foreground mt-1">{session.time}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-foreground ${session.completed ? "line-through" : ""}`}>
                        {session.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {session.topic && (
                          <p className="text-xs text-muted-foreground truncate">{session.topic}</p>
                        )}
                        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                          <TypeIcon className="w-3 h-3" />
                          {session.sessionType}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{session.duration}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {session.completed ? (
                      <button
                        onClick={() => toggleComplete(session.id)}
                        className="flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-3 py-1.5 rounded-lg hover:bg-success/20 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Done
                      </button>
                    ) : (
                      <button
                        onClick={() => handleComplete(session)}
                        className="flex items-center gap-1 text-xs font-medium gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Check className="w-3 h-3" /> Complete
                      </button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(session)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ArrowRightLeft className="w-4 h-4 mr-2" /> Move to
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {DAYS.filter((d) => d !== selectedDay).map((d) => (
                              <DropdownMenuItem key={d} onClick={() => handleMove(session.id, d)}>
                                {d}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(session.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add Session Button */}
          <Button variant="outline" className="w-full border-dashed" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Session
          </Button>
        </div>

        {/* Strict Mode Info */}
        {strictMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border-l-4 border-l-accent">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground">Strict Mode Active</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  You must write a 3-sentence summary of what you learned before a session can be marked complete.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Session Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Session — {selectedDay}</DialogTitle>
            <DialogDescription>Create a new study session for this day.</DialogDescription>
          </DialogHeader>
          {sessionFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => handleSave(false)}>Add Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={!!editSession} onOpenChange={(v) => !v && setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Update this study session.</DialogDescription>
          </DialogHeader>
          {sessionFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>Cancel</Button>
            <Button onClick={() => handleSave(true)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Strict Mode Summary Dialog */}
      <Dialog open={!!summarySession} onOpenChange={(v) => !v && setSummarySession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mandatory Summary</DialogTitle>
            <DialogDescription>
              Write at least <strong>3 sentences</strong> about what you learned in this session.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
            className="font-mono"
            placeholder="I learned about Star-Delta transformation and its application in circuit analysis. The key insight was..."
          />
          <div className="flex items-center justify-between">
            <p className={`text-xs font-mono ${canSubmitSummary ? "text-success" : "text-muted-foreground"}`}>
              {sentenceCount}/3 sentences · {wordCount} words
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummarySession(null)}>Cancel</Button>
            <Button disabled={!canSubmitSummary} onClick={submitSummary}>
              Submit & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
