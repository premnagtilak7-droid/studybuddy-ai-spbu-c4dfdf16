import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Check, Plus, MoreVertical, Pencil, Trash2, ArrowRightLeft,
  AlertTriangle, BookOpen, Beaker, Wrench, FlaskConical, GripVertical,
  LayoutList, LayoutGrid, CalendarClock, Bell, Copy,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { logStudyMinutes } from "@/lib/daily-goal-store";
import { recordStudySession } from "@/lib/study-tracker";
import {
  getReminder, setReminder as saveReminder, clearReminder,
  requestNotificationPermission, scheduleAllReminders,
} from "@/lib/timetable-helpers";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DURATIONS = ["30min", "1h", "1.5h", "2h", "2.5h", "3h"];
const SESSION_TYPES = ["Study", "Revision", "Practice", "Lab"] as const;
type SessionType = (typeof SESSION_TYPES)[number];
const REPEAT_TYPES = ["once", "weekly", "daily"] as const;
type RepeatType = (typeof REPEAT_TYPES)[number];

const SESSION_TYPE_ICONS: Record<SessionType, typeof BookOpen> = {
  Study: BookOpen, Revision: Beaker, Practice: Wrench, Lab: FlaskConical,
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
  repeat: RepeatType;
};

type Schedule = Record<string, Session[]>;

function parseDuration(d: string): number {
  if (d.endsWith("min")) return parseInt(d) / 60;
  return parseFloat(d.replace("h", ""));
}

function toMin(t: string): number {
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

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

function DaySummaryBar({ sessions }: { sessions: Session[] }) {
  const total = sessions.length;
  const completed = sessions.filter((s) => s.completed).length;
  const totalHours = sessions.reduce((a, s) => a + parseDuration(s.duration), 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (total === 0) return null;
  return (
    <div className="glass-card px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground flex-1">
        <span className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />{total} session{total !== 1 ? "s" : ""}</span>
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{totalHours.toFixed(1)}h</span>
        <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{completed}/{total}</span>
      </div>
      <div className="w-32"><Progress value={pct} className="h-2" /></div>
      <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function Timetable() {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [schedule, setSchedule] = useState<Schedule>(loadSchedule);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [weekView, setWeekView] = useState(false);
  const [strictMode, setStrictMode] = useState(() => {
    const stored = localStorage.getItem(STRICT_KEY);
    return stored === null ? true : stored === "true";
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addDay, setAddDay] = useState("Monday");
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editDay, setEditDay] = useState("Monday");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDay, setDeleteDay] = useState("Monday");
  const [summarySession, setSummarySession] = useState<Session | null>(null);
  const [summaryDay, setSummaryDay] = useState("Monday");
  const [summary, setSummary] = useState("");

  // Copy dialog
  const [copySession, setCopySession] = useState<Session | null>(null);
  const [copyFromDay, setCopyFromDay] = useState("Monday");
  const [copyDays, setCopyDays] = useState<string[]>([]);

  // Reminder dialog
  const [reminderSession, setReminderSession] = useState<Session | null>(null);
  const [reminderValue, setReminderValue] = useState<string>("");

  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formTime, setFormTime] = useState("8:00 AM");
  const [formDuration, setFormDuration] = useState("1h");
  const [formType, setFormType] = useState<SessionType>("Study");
  const [formRepeat, setFormRepeat] = useState<RepeatType>("once");

  const dragItem = useRef<{ day: string; index: number } | null>(null);
  const dragOver = useRef<{ day: string; index: number } | null>(null);

  useEffect(() => { getSubjects().then(setSubjects).catch(() => {}); }, []);
  useEffect(() => { localStorage.setItem(STRICT_KEY, String(strictMode)); }, [strictMode]);
  useEffect(() => { scheduleAllReminders(); }, [schedule]);

  const persist = useCallback((next: Schedule) => {
    setSchedule(next);
    saveSchedule(next);
  }, []);

  const resetForm = () => {
    setFormSubject(""); setFormTopic(""); setFormTime("8:00 AM");
    setFormDuration("1h"); setFormType("Study"); setFormRepeat("once");
  };

  const openAdd = (day: string) => { resetForm(); setAddDay(day); setAddOpen(true); };

  const openEdit = (s: Session, day: string) => {
    setFormSubject(s.subject); setFormTopic(s.topic); setFormTime(s.time);
    setFormDuration(s.duration); setFormType(s.sessionType);
    setFormRepeat(s.repeat || "once"); setEditSession(s); setEditDay(day);
  };

  const getColor = (name: string) => subjects.find((s) => s.name === name)?.color || "chart-1";

  const handleSave = (isEdit: boolean) => {
    if (!formSubject) { toast.error("Please select a subject"); return; }
    const next = { ...schedule };
    if (isEdit && editSession) {
      next[editDay] = next[editDay].map((s) =>
        s.id === editSession.id
          ? { ...s, subject: formSubject, topic: formTopic, time: formTime, duration: formDuration, sessionType: formType, color: getColor(formSubject), repeat: formRepeat }
          : s
      );
      setEditSession(null);
      toast.success("Session updated");
    } else {
      const newSession: Session = {
        id: genId(), subject: formSubject, topic: formTopic, time: formTime,
        duration: formDuration, sessionType: formType, completed: false,
        color: getColor(formSubject), repeat: formRepeat,
      };
      if (formRepeat === "daily") {
        DAYS.forEach((d) => { next[d] = [...(next[d] || []), { ...newSession, id: d === addDay ? newSession.id : genId() }]; });
      } else {
        next[addDay] = [...(next[addDay] || []), newSession];
      }
      setAddOpen(false);
      toast.success(formRepeat === "daily" ? "Session added to all days" : "Session added");
    }
    persist(next); resetForm();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const next = { ...schedule };
    next[deleteDay] = next[deleteDay].filter((s) => s.id !== deleteId);
    persist(next); setDeleteId(null); toast.success("Session deleted");
  };

  const handleMove = (sessionId: string, fromDay: string, targetDay: string) => {
    const session = (schedule[fromDay] || []).find((s) => s.id === sessionId);
    if (!session) return;
    const next = { ...schedule };
    next[fromDay] = next[fromDay].filter((s) => s.id !== sessionId);
    next[targetDay] = [...(next[targetDay] || []), session];
    persist(next); toast.success(`Moved to ${targetDay}`);
  };

  const handleCopy = () => {
    if (!copySession || copyDays.length === 0) return;
    const next = { ...schedule };
    copyDays.forEach((d) => {
      next[d] = [...(next[d] || []), { ...copySession, id: genId(), completed: false }];
    });
    persist(next);
    setCopySession(null); setCopyDays([]);
    toast.success(`Copied to ${copyDays.length} day${copyDays.length > 1 ? "s" : ""}`);
  };

  const handleSetReminder = async () => {
    if (!reminderSession || !reminderValue) return;
    const granted = await requestNotificationPermission();
    if (!granted) {
      toast.error("Please allow notifications in your browser settings");
      return;
    }
    saveReminder(reminderSession.id, parseInt(reminderValue));
    scheduleAllReminders();
    setReminderSession(null);
    toast.success(`Reminder set for ${reminderValue} min before`);
  };

  const handleClearReminder = (sessionId: string) => {
    clearReminder(sessionId);
    scheduleAllReminders();
    toast.success("Reminder cleared");
  };

  const handleComplete = (session: Session, day: string) => {
    if (strictMode) {
      setSummarySession(session); setSummaryDay(day); setSummary("");
    } else {
      toggleComplete(session.id, day, session);
    }
  };

  const toggleComplete = async (id: string, day: string, session?: Session) => {
    const next = { ...schedule };
    const s = next[day].find((s) => s.id === id);
    if (!s) return;
    const wasCompleted = s.completed;
    next[day] = next[day].map((s) => s.id === id ? { ...s, completed: !s.completed } : s);
    persist(next);

    // Log to study_logs when marking complete (not when un-marking)
    if (!wasCompleted) {
      const durationMinutes = Math.round(parseDuration(s.duration) * 60);
      const subj = subjects.find((sub) => sub.name === s.subject);
      try {
        await logStudyMinutes(durationMinutes, subj?.id);
        recordStudySession();
      } catch {
        // silent - still mark complete locally
      }
      toast.success("Session completed! Study time logged.");
    } else {
      toast.success("Session unmarked");
    }
  };

  const submitSummary = () => {
    if (!summarySession) return;
    toggleComplete(summarySession.id, summaryDay, summarySession);
    setSummarySession(null); setSummary("");
  };

  const handleDragStart = (day: string, index: number) => { dragItem.current = { day, index }; };
  const handleDragEnter = (day: string, index: number) => { dragOver.current = { day, index }; };
  const handleDragEnd = () => {
    if (!dragItem.current || !dragOver.current) return;
    if (dragItem.current.day !== dragOver.current.day || dragItem.current.index === dragOver.current.index) {
      dragItem.current = null; dragOver.current = null; return;
    }
    const day = dragItem.current.day;
    const next = { ...schedule };
    const list = [...(next[day] || [])];
    const [removed] = list.splice(dragItem.current.index, 1);
    list.splice(dragOver.current.index, 0, removed);
    next[day] = list;
    persist(next);
    dragItem.current = null; dragOver.current = null;
  };

  const sortSessions = (sessions: Session[]) => [...sessions].sort((a, b) => toMin(a.time) - toMin(b.time));

  const sentenceCount = summary.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const canSubmitSummary = sentenceCount >= 3;

  const sessionFormContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Subject</Label>
        <Select value={formSubject} onValueChange={setFormSubject}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>{subjects.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}</SelectContent>
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
            <SelectContent className="max-h-60">{TIME_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={formDuration} onValueChange={setFormDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DURATIONS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Session Type</Label>
          <Select value={formType} onValueChange={(v) => setFormType(v as SessionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SESSION_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Repeat</Label>
          <Select value={formRepeat} onValueChange={(v) => setFormRepeat(v as RepeatType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="once">One-time</SelectItem>
              <SelectItem value="weekly">Weekly Recurring</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderSessionCard = (session: Session, index: number, day: string, compact = false) => {
    const TypeIcon = SESSION_TYPE_ICONS[session.sessionType] || BookOpen;
    const reminder = getReminder(session.id);
    return (
      <div
        key={session.id}
        draggable
        onDragStart={() => handleDragStart(day, index)}
        onDragEnter={() => handleDragEnter(day, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
        className={`glass-card ${compact ? "p-2.5" : "p-4"} flex items-center justify-between border-l-4 ${session.completed ? "opacity-60" : ""} cursor-default`}
        style={{ borderLeftColor: `hsl(var(--${session.color}))` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground flex-shrink-0 touch-none" aria-label="Drag to reorder">
            <GripVertical className="w-4 h-4" />
          </button>
          {!compact && (
            <div className="text-center flex-shrink-0">
              <Clock className="w-4 h-4 text-muted-foreground mx-auto" />
              <p className="text-xs font-mono text-muted-foreground mt-1">{session.time}</p>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={`${compact ? "text-xs" : "text-sm"} font-semibold text-foreground ${session.completed ? "line-through" : ""} truncate`}>
                {session.subject}
              </p>
              {session.repeat && session.repeat !== "once" && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                  {session.repeat === "weekly" ? "🔁 Weekly" : "🔁 Daily"}
                </Badge>
              )}
              {session.repeat === "once" && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">1️⃣ Once</Badge>
              )}
              {reminder != null && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                  🔔 {reminder}m
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {compact && <span className="text-[10px] font-mono text-muted-foreground">{session.time}</span>}
              {session.topic && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{session.topic}</p>}
              <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                <TypeIcon className="w-2.5 h-2.5" />{session.sessionType}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{session.duration}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {session.completed ? (
            <button onClick={() => toggleComplete(session.id, day, session)}
              className={`flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-lg hover:bg-success/20 transition-colors`}>
              <Check className="w-3 h-3" /> Done
            </button>
          ) : (
            <button onClick={() => handleComplete(session, day)}
              className={`flex items-center gap-1 text-[10px] font-medium gradient-primary text-primary-foreground ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-lg hover:opacity-90 transition-opacity`}>
              <Check className="w-3 h-3" />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(session, day)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCopySession(session); setCopyFromDay(day); setCopyDays([]); }}>
                <Copy className="w-4 h-4 mr-2" /> Copy to Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setReminderSession(session);
                setReminderValue(String(getReminder(session.id) || "15"));
              }}>
                <Bell className="w-4 h-4 mr-2" /> {getReminder(session.id) != null ? "Change Reminder" : "Set Reminder"}
              </DropdownMenuItem>
              {getReminder(session.id) != null && (
                <DropdownMenuItem onClick={() => handleClearReminder(session.id)}>
                  <Bell className="w-4 h-4 mr-2 opacity-50" /> Clear Reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><ArrowRightLeft className="w-4 h-4 mr-2" /> Move to</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {DAYS.filter((d) => d !== day).map((d) => (
                    <DropdownMenuItem key={d} onClick={() => handleMove(session.id, day, d)}>{d}</DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setDeleteId(session.id); setDeleteDay(day); }}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const sessions = schedule[selectedDay] || [];
  const sortedSessions = sortSessions(sessions);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart Timetable</h1>
            <p className="text-sm text-muted-foreground mt-1">Weekly recurring scheduler</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-1">
              <button onClick={() => setWeekView(false)}
                className={`p-1.5 rounded-md transition-colors ${!weekView ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Day view"><LayoutList className="w-4 h-4" /></button>
              <button onClick={() => setWeekView(true)}
                className={`p-1.5 rounded-md transition-colors ${weekView ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Week view"><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
              <AlertTriangle className={`w-4 h-4 ${strictMode ? "text-accent" : "text-muted-foreground"}`} />
              <Label htmlFor="strict-mode" className="text-xs font-medium cursor-pointer select-none">Strict Mode</Label>
              <Switch id="strict-mode" checked={strictMode} onCheckedChange={setStrictMode} />
            </div>
          </div>
        </div>

        {weekView ? (
          <div className="grid grid-cols-7 gap-2 overflow-x-auto">
            {DAYS.map((day) => {
              const daySessions = sortSessions(schedule[day] || []);
              return (
                <div key={day} className="min-w-[160px]">
                  <div className={`text-center text-xs font-semibold py-2 rounded-t-lg ${day === selectedDay ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {day.slice(0, 3)}<span className="ml-1 opacity-70">({daySessions.length})</span>
                  </div>
                  <div className="border border-t-0 border-border rounded-b-lg p-1.5 space-y-1.5 min-h-[120px] bg-card/50">
                    {daySessions.length === 0 ? (
                      <button onClick={() => openAdd(day)} className="w-full py-6 text-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors">
                        <Plus className="w-5 h-5 mx-auto mb-1" /><span className="text-[10px]">Add</span>
                      </button>
                    ) : (
                      <>
                        {daySessions.map((s, i) => renderSessionCard(s, i, day, true))}
                        <button onClick={() => openAdd(day)} className="w-full py-1 text-center text-[10px] text-muted-foreground/50 hover:text-muted-foreground border border-dashed border-border rounded-lg transition-colors">
                          <Plus className="w-3 h-3 inline mr-0.5" />Add
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {DAYS.map((d) => {
                const count = (schedule[d] || []).length;
                return (
                  <button key={d} onClick={() => setSelectedDay(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedDay === d ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>
                    {d.slice(0, 3)}
                    {count > 0 && <span className={`ml-1.5 text-[10px] font-mono ${selectedDay === d ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{count}</span>}
                  </button>
                );
              })}
            </div>

            <DaySummaryBar sessions={sessions} />

            <div className="space-y-3">
              {sortedSessions.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass-card">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground font-medium">No sessions yet for {selectedDay}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Plan your study sessions to stay on track</p>
                  <Button onClick={() => openAdd(selectedDay)} size="lg"><Plus className="w-4 h-4 mr-1" /> Add First Session</Button>
                </motion.div>
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {sortedSessions.map((session, i) => (
                      <motion.div key={session.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.05 }}>
                        {renderSessionCard(session, i, selectedDay)}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <Button variant="outline" className="w-full border-dashed" onClick={() => openAdd(selectedDay)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Session
                  </Button>
                </>
              )}
            </div>

            {strictMode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border-l-4 border-l-accent">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Strict Mode Active</h4>
                    <p className="text-xs text-muted-foreground mt-1">You must write a 3-sentence summary of what you learned before a session can be marked complete.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Add Session Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Session — {addDay}</DialogTitle><DialogDescription>Create a new study session.</DialogDescription></DialogHeader>
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
          <DialogHeader><DialogTitle>Edit Session</DialogTitle><DialogDescription>Update this study session.</DialogDescription></DialogHeader>
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
          <AlertDialogHeader><AlertDialogTitle>Delete Session</AlertDialogTitle><AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Strict Mode Summary Dialog */}
      <Dialog open={!!summarySession} onOpenChange={(v) => !v && setSummarySession(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mandatory Summary</DialogTitle><DialogDescription>Write at least <strong>3 sentences</strong> about what you learned.</DialogDescription></DialogHeader>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} className="font-mono"
            placeholder="I learned about Star-Delta transformation and its application in circuit analysis. The key insight was..." />
          <div className="flex items-center justify-between">
            <p className={`text-xs font-mono ${canSubmitSummary ? "text-success" : "text-muted-foreground"}`}>{sentenceCount}/3 sentences · {wordCount} words</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummarySession(null)}>Cancel</Button>
            <Button disabled={!canSubmitSummary} onClick={submitSummary}>Submit & Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Session Dialog */}
      <Dialog open={!!copySession} onOpenChange={(v) => !v && setCopySession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Session to Days</DialogTitle>
            <DialogDescription>Select which days to copy "{copySession?.subject}" to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {DAYS.filter((d) => d !== copyFromDay).map((d) => (
              <div key={d} className="flex items-center gap-2">
                <Checkbox
                  id={`copy-${d}`}
                  checked={copyDays.includes(d)}
                  onCheckedChange={(checked) => {
                    setCopyDays(checked ? [...copyDays, d] : copyDays.filter((x) => x !== d));
                  }}
                />
                <Label htmlFor={`copy-${d}`} className="text-sm cursor-pointer">{d}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopySession(null)}>Cancel</Button>
            <Button onClick={handleCopy} disabled={copyDays.length === 0}>
              Copy to {copyDays.length} day{copyDays.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={!!reminderSession} onOpenChange={(v) => !v && setReminderSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>
            <DialogDescription>Get a browser notification before "{reminderSession?.subject}" starts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Remind me before</Label>
            <Select value={reminderValue} onValueChange={setReminderValue}>
              <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderSession(null)}>Cancel</Button>
            <Button onClick={handleSetReminder}>Set Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
