import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Check, Plus, MoreVertical, Pencil, Trash2,
  BookOpen, Beaker, Wrench, FlaskConical, GripVertical,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, addWeeks, addDays, getHours, getMinutes } from "date-fns";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
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
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";

type ViewMode = "month" | "week" | "day";

const SESSION_TYPES = ["Study", "Revision", "Practice", "Lab"] as const;
type SessionType = (typeof SESSION_TYPES)[number];
const REPEAT_TYPES = ["once", "weekly", "daily"] as const;
type RepeatType = (typeof REPEAT_TYPES)[number];

const SESSION_TYPE_ICONS: Record<SessionType, typeof BookOpen> = {
  Study: BookOpen, Revision: Beaker, Practice: Wrench, Lab: FlaskConical,
};

const DURATIONS = ["30min", "1h", "1.5h", "2h", "2.5h", "3h"];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM

type TimetableSession = {
  id: string;
  user_id: string;
  subject: string;
  topic: string | null;
  start_time: string;
  duration: string;
  session_type: string;
  is_completed: boolean;
  color: string;
  repeat_type: string;
  day_of_week: string;
  sort_order: number;
  created_at: string;
};

type ExamDate = {
  id: string;
  exam_date: string;
  label: string | null;
  subject_id: string | null;
};

function parseDuration(d: string): number {
  if (d.endsWith("min")) return parseInt(d) / 60;
  return parseFloat(d.replace("h", ""));
}

function timeToMinutes(t: string): number {
  const [time, period] = t.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function formatTimeSlot(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h}:00 ${ampm}`;
}

const TIME_OPTIONS = [
  "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM",
  "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM",
  "11:00 PM",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getDayName(date: Date): string {
  return format(date, "EEEE");
}

export default function Timetable() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [examDates, setExamDates] = useState<ExamDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [strictMode, setStrictMode] = useState(false);

  // Form state
  const [addOpen, setAddOpen] = useState(false);
  const [addDay, setAddDay] = useState("Monday");
  const [addTime, setAddTime] = useState("8:00 AM");
  const [editSession, setEditSession] = useState<TimetableSession | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [summarySession, setSummarySession] = useState<TimetableSession | null>(null);
  const [summary, setSummary] = useState("");

  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formTime, setFormTime] = useState("8:00 AM");
  const [formDuration, setFormDuration] = useState("1h");
  const [formType, setFormType] = useState<SessionType>("Study");
  const [formRepeat, setFormRepeat] = useState<RepeatType>("once");
  const [formDay, setFormDay] = useState("Monday");

  // Drag state
  const [dragSession, setDragSession] = useState<TimetableSession | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [subs, sessRes, examRes] = await Promise.all([
        getSubjects(),
        supabase.from("timetable_sessions").select("*").order("sort_order", { ascending: true }),
        supabase.from("exam_dates").select("*"),
      ]);
      setSubjects(subs);
      if (sessRes.error) throw sessRes.error;
      setSessions((sessRes.data || []) as TimetableSession[]);
      if (!examRes.error) setExamDates((examRes.data || []) as ExamDate[]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useRealtimeSubscription("timetable_sessions", loadData);

  const getColor = (name: string) => subjects.find((s) => s.name === name)?.color || "chart-1";

  const getSessionsForDay = useCallback((dayName: string) => {
    return sessions
      .filter(s => s.day_of_week === dayName)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }, [sessions]);

  const resetForm = () => {
    setFormSubject(""); setFormTopic(""); setFormTime("8:00 AM");
    setFormDuration("1h"); setFormType("Study"); setFormRepeat("once"); setFormDay("Monday");
  };

  const openAddForSlot = (dayName: string, time?: string) => {
    resetForm();
    setFormDay(dayName);
    if (time) setFormTime(time);
    setAddOpen(true);
  };

  const openEdit = (s: TimetableSession) => {
    setFormSubject(s.subject);
    setFormTopic(s.topic || "");
    setFormTime(s.start_time);
    setFormDuration(s.duration);
    setFormType(s.session_type as SessionType);
    setFormRepeat(s.repeat_type as RepeatType);
    setFormDay(s.day_of_week);
    setEditSession(s);
  };

  const handleSave = async (isEdit: boolean) => {
    if (!formSubject) { toast.error("Please select a subject"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }

    try {
      if (isEdit && editSession) {
        const { error } = await supabase.from("timetable_sessions").update({
          subject: formSubject, topic: formTopic || null, start_time: formTime,
          duration: formDuration, session_type: formType, color: getColor(formSubject),
          repeat_type: formRepeat, day_of_week: formDay,
        }).eq("id", editSession.id);
        if (error) throw error;
        setEditSession(null);
        toast.success("Session updated");
      } else {
        const daysToAdd = formRepeat === "daily" ? DAYS : [formDay];
        const inserts = daysToAdd.map(day => ({
          user_id: user.id, subject: formSubject, topic: formTopic || null,
          start_time: formTime, duration: formDuration, session_type: formType,
          color: getColor(formSubject), repeat_type: formRepeat, day_of_week: day,
          sort_order: sessions.length,
        }));
        const { error } = await supabase.from("timetable_sessions").insert(inserts);
        if (error) throw error;
        setAddOpen(false);
        toast.success(formRepeat === "daily" ? "Session added to all days" : "Session added");
      }
      resetForm();
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("timetable_sessions").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success("Session deleted"); loadData(); }
    setDeleteId(null);
  };

  const handleComplete = async (session: TimetableSession) => {
    if (strictMode && !session.is_completed) {
      setSummarySession(session); setSummary("");
      return;
    }
    await toggleComplete(session);
  };

  const toggleComplete = async (session: TimetableSession) => {
    const newVal = !session.is_completed;
    const { error } = await supabase.from("timetable_sessions").update({ is_completed: newVal }).eq("id", session.id);
    if (error) { toast.error(error.message); return; }
    if (newVal) {
      const mins = Math.round(parseDuration(session.duration) * 60);
      const subj = subjects.find(s => s.name === session.subject);
      try { await logStudyMinutes(mins, subj?.id); recordStudySession(); } catch {}
      toast.success("Session completed! Study time logged.");
    }
    loadData();
  };

  const submitSummary = async () => {
    if (!summarySession) return;
    await toggleComplete(summarySession);
    setSummarySession(null); setSummary("");
  };

  const handleDrop = async (targetDay: string, targetTime?: string) => {
    if (!dragSession) return;
    const updates: any = { day_of_week: targetDay };
    if (targetTime) updates.start_time = targetTime;
    const { error } = await supabase.from("timetable_sessions").update(updates).eq("id", dragSession.id);
    if (error) toast.error(error.message);
    else { toast.success(`Moved to ${targetDay}${targetTime ? ` at ${targetTime}` : ""}`); loadData(); }
    setDragSession(null);
  };

  const sentenceCount = summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const canSubmitSummary = sentenceCount >= 3;

  // Navigation
  const navigate = (dir: number) => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, dir));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, dir));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const goToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy");
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} — ${format(we, "MMM d, yyyy")}`;
    }
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [currentDate, viewMode]);

  // Calendar days for month view
  const monthDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const ws = startOfWeek(ms, { weekStartsOn: 1 });
    const we = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [currentDate]);

  const getExamsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return examDates.filter(e => e.exam_date === dateStr);
  };

  // Session form
  const sessionFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Day</Label>
          <Select value={formDay} onValueChange={setFormDay}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={formSubject} onValueChange={setFormSubject}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Topic (optional)</Label>
        <Input placeholder="e.g. Kirchhoff's Laws" value={formTopic} onChange={e => setFormTopic(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Time</Label>
          <Select value={formTime} onValueChange={setFormTime}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={formDuration} onValueChange={setFormDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formType} onValueChange={v => setFormType(v as SessionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SESSION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Repeat</Label>
          <Select value={formRepeat} onValueChange={v => setFormRepeat(v as RepeatType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="once">One-time</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // Render a compact session pill
  const renderPill = (s: TimetableSession) => {
    const TypeIcon = SESSION_TYPE_ICONS[s.session_type as SessionType] || BookOpen;
    return (
      <div
        key={s.id}
        draggable
        onDragStart={() => setDragSession(s)}
        className={`text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate cursor-grab active:cursor-grabbing flex items-center gap-1 ${s.is_completed ? "opacity-50 line-through" : ""}`}
        style={{ borderLeftColor: `hsl(var(--${s.color}))`, backgroundColor: `hsl(var(--${s.color}) / 0.1)` }}
        onClick={(e) => { e.stopPropagation(); openEdit(s); }}
        title={`${s.subject}${s.topic ? ` — ${s.topic}` : ""} · ${s.start_time} · ${s.duration}`}
      >
        <TypeIcon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: `hsl(var(--${s.color}))` }} />
        <span className="truncate font-medium">{s.subject}</span>
      </div>
    );
  };

  // Full session card for day/week detail
  const renderCard = (s: TimetableSession) => {
    const TypeIcon = SESSION_TYPE_ICONS[s.session_type as SessionType] || BookOpen;
    return (
      <div
        key={s.id}
        draggable
        onDragStart={() => setDragSession(s)}
        className={`glass-card p-3 border-l-4 flex items-center justify-between cursor-grab active:cursor-grabbing ${s.is_completed ? "opacity-60" : ""}`}
        style={{ borderLeftColor: `hsl(var(--${s.color}))` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-semibold text-foreground truncate ${s.is_completed ? "line-through" : ""}`}>{s.subject}</span>
              {s.repeat_type !== "once" && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">🔁 {s.repeat_type}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground">{s.start_time}</span>
              {s.topic && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{s.topic}</span>}
              <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded">
                <TypeIcon className="w-2.5 h-2.5" />{s.session_type}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{s.duration}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => handleComplete(s)}
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${s.is_completed ? "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)]" : "gradient-primary text-primary-foreground"}`}>
            <Check className="w-3 h-3" /> {s.is_completed ? "Done" : ""}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><MoreVertical className="w-3.5 h-3.5" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // ─── MONTH VIEW ───
  const renderMonthView = () => (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 border-r border-border last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDays.map((day, i) => {
          const dayName = getDayName(day);
          const daySessions = getSessionsForDay(dayName);
          const dayExams = getExamsForDate(day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          return (
            <div
              key={i}
              className={`min-h-[100px] p-1.5 border-r border-b border-border last:border-r-0 cursor-pointer hover:bg-muted/30 transition-colors ${!inMonth ? "opacity-40" : ""} ${today ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}
              onClick={() => openAddForSlot(dayName)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(dayName)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono ${today ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </span>
                {dayExams.length > 0 && <span className="text-[9px] bg-destructive/10 text-destructive px-1 rounded">📝 Exam</span>}
              </div>
              <div className="space-y-0.5">
                {daySessions.slice(0, 3).map(renderPill)}
                {daySessions.length > 3 && <span className="text-[9px] text-muted-foreground">+{daySessions.length - 3} more</span>}
              </div>
              {dayExams.map(ex => (
                <div key={ex.id} className="text-[9px] mt-0.5 px-1 py-0.5 rounded bg-destructive/10 text-destructive truncate">
                  {ex.label || "Exam"}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── WEEK VIEW ───
  const renderWeekView = () => (
    <div className="glass-card overflow-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
          <div className="p-2 border-r border-border" />
          {weekDays.map((day, i) => {
            const today = isToday(day);
            const dayExams = getExamsForDate(day);
            return (
              <div key={i} className={`text-center py-2 border-r border-border last:border-r-0 ${today ? "bg-primary/5" : ""}`}>
                <span className="text-[10px] text-muted-foreground font-mono">{format(day, "EEE")}</span>
                <div className={`text-sm font-bold ${today ? "bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center mx-auto" : "text-foreground"}`}>
                  {format(day, "d")}
                </div>
                {dayExams.length > 0 && <Badge variant="destructive" className="text-[8px] px-1 py-0 mt-0.5">Exam</Badge>}
              </div>
            );
          })}
        </div>
        {/* Time slots */}
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[60px]">
            <div className="text-[10px] font-mono text-muted-foreground p-1 border-r border-border text-right pr-2 pt-1">
              {formatTimeSlot(hour)}
            </div>
            {weekDays.map((day, i) => {
              const dayName = getDayName(day);
              const slotSessions = getSessionsForDay(dayName).filter(s => {
                const mins = timeToMinutes(s.start_time);
                return Math.floor(mins / 60) === hour;
              });
              const timeStr = formatTimeSlot(hour);
              return (
                <div
                  key={i}
                  className={`border-r border-border/50 last:border-r-0 p-0.5 cursor-pointer hover:bg-muted/20 transition-colors ${isToday(day) ? "bg-primary/[0.02]" : ""}`}
                  onClick={() => openAddForSlot(dayName, timeStr)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(dayName, timeStr)}
                >
                  {slotSessions.map(s => (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragSession(s); }}
                      onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                      className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate cursor-grab active:cursor-grabbing border-l-2 ${s.is_completed ? "opacity-50 line-through" : ""}`}
                      style={{ borderLeftColor: `hsl(var(--${s.color}))`, backgroundColor: `hsl(var(--${s.color}) / 0.12)` }}
                      title={`${s.subject}${s.topic ? ` — ${s.topic}` : ""}`}
                    >
                      <span className="font-medium">{s.subject}</span>
                      <span className="text-muted-foreground ml-1">{s.duration}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // ─── DAY VIEW ───
  const renderDayView = () => {
    const dayName = getDayName(currentDate);
    const daySessions = getSessionsForDay(dayName);
    const dayExams = getExamsForDate(currentDate);
    const today = isToday(currentDate);

    return (
      <div className="space-y-4">
        {dayExams.length > 0 && (
          <div className="glass-card p-3 border-l-4 border-l-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">Exam Day</span>
            </div>
            {dayExams.map(ex => (
              <p key={ex.id} className="text-xs text-muted-foreground mt-1">{ex.label || "Exam"}</p>
            ))}
          </div>
        )}

        {/* Summary */}
        {daySessions.length > 0 && (
          <div className="glass-card px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground flex-1">
              <span>{daySessions.length} session{daySessions.length !== 1 ? "s" : ""}</span>
              <span>{daySessions.reduce((a, s) => a + parseDuration(s.duration), 0).toFixed(1)}h total</span>
              <span>{daySessions.filter(s => s.is_completed).length}/{daySessions.length} done</span>
            </div>
            <div className="w-32">
              <Progress value={daySessions.length > 0 ? Math.round((daySessions.filter(s => s.is_completed).length / daySessions.length) * 100) : 0} className="h-2" />
            </div>
          </div>
        )}

        {/* Hourly grid */}
        <div className="glass-card overflow-hidden">
          {HOURS.map(hour => {
            const slotSessions = daySessions.filter(s => Math.floor(timeToMinutes(s.start_time) / 60) === hour);
            const timeStr = formatTimeSlot(hour);
            return (
              <div
                key={hour}
                className="flex border-b border-border/50 min-h-[64px] hover:bg-muted/10 transition-colors cursor-pointer"
                onClick={() => openAddForSlot(dayName, timeStr)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(dayName, timeStr)}
              >
                <div className="w-16 flex-shrink-0 text-[11px] font-mono text-muted-foreground p-2 text-right border-r border-border">
                  {timeStr}
                </div>
                <div className="flex-1 p-1.5 space-y-1">
                  {slotSessions.map(s => (
                    <div key={s.id} onClick={e => e.stopPropagation()}>
                      {renderCard(s)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {daySessions.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No sessions for {dayName}</p>
            <Button onClick={() => openAddForSlot(dayName)} className="mt-3"><Plus className="w-4 h-4 mr-1" /> Add Session</Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Plan & track your study schedule</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
              <AlertTriangle className={`w-3.5 h-3.5 ${strictMode ? "text-accent" : "text-muted-foreground"}`} />
              <Label htmlFor="strict" className="text-xs cursor-pointer">Strict</Label>
              <Switch id="strict" checked={strictMode} onCheckedChange={setStrictMode} />
            </div>
            <Button onClick={() => openAddForSlot(getDayName(currentDate))} size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
        </div>

        {/* View toggle & navigation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-1">
            {(["month", "week", "day"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button onClick={goToday} className="text-sm font-medium text-foreground hover:text-primary transition-colors px-2">
              {headerLabel}
            </button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">Today</Button>
          </div>
        </div>

        {/* View content */}
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Session</DialogTitle><DialogDescription>Create a new study session.</DialogDescription></DialogHeader>
          {sessionFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => handleSave(false)}>Add Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editSession} onOpenChange={v => !v && setEditSession(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Session</DialogTitle><DialogDescription>Update this session.</DialogDescription></DialogHeader>
          {sessionFormContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>Cancel</Button>
            <Button onClick={() => handleSave(true)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Session</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Strict Mode Summary */}
      <Dialog open={!!summarySession} onOpenChange={v => !v && setSummarySession(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Session Summary</DialogTitle><DialogDescription>Write at least 3 sentences about what you learned.</DialogDescription></DialogHeader>
          <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={5} placeholder="I learned about..." className="font-mono" />
          <p className={`text-xs font-mono ${canSubmitSummary ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>{sentenceCount}/3 sentences</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummarySession(null)}>Cancel</Button>
            <Button disabled={!canSubmitSummary} onClick={submitSummary}>Submit & Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
