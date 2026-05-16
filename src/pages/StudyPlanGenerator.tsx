import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Calendar as CalendarIcon, BookOpen, Clock, Loader2,
  Trash2, Download, ChevronDown, ChevronUp, RefreshCw, FileText, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SubjectInput = {
  id: string;
  name: string;
  topicsRemaining: string;
  totalTopics: number;
  examDate: Date | undefined;
  selected: boolean;
};

type PlanTask = { subject: string; topic: string; hours: number; isRevision?: boolean; completed?: boolean };
type PlanDay = { date: string; day: string; tasks: PlanTask[]; note?: string };

const GEMINI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;

export default function StudyPlanGenerator() {
  const [subjects, setSubjects] = useState<SubjectInput[]>([]);
  const [plan, setPlan] = useState<PlanDay[] | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dailyHours, setDailyHours] = useState(4);
  const [difficulty, setDifficulty] = useState("balanced");
  const [savedPlans, setSavedPlans] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  // Load subjects from DB
  useEffect(() => {
    async function load() {
      try {
        const { data: dbSubjects } = await supabase.from("subjects").select("id, name");
        if (!dbSubjects?.length) { setDataLoading(false); return; }

        const subjectIds = dbSubjects.map((s) => s.id);
        const [{ data: units }, { data: examDates }] = await Promise.all([
          supabase.from("units").select("id, subject_id").in("subject_id", subjectIds),
          supabase.from("exam_dates").select("subject_id, exam_date").in("subject_id", subjectIds),
        ]);

        const unitIds = (units || []).map((u) => u.id);
        const { data: topics } = unitIds.length
          ? await supabase.from("topics").select("unit_id, name, is_completed").in("unit_id", unitIds)
          : { data: [] };

        const loaded: SubjectInput[] = dbSubjects.map((s) => {
          const sUnits = (units || []).filter((u) => u.subject_id === s.id);
          const sUnitIds = sUnits.map((u) => u.id);
          const allTopics = (topics || []).filter((t) => sUnitIds.includes(t.unit_id));
          const remaining = allTopics.filter((t) => !t.is_completed).map((t) => t.name);
          const exam = (examDates || []).find((e) => e.subject_id === s.id);
          return {
            id: s.id,
            name: s.name,
            topicsRemaining: remaining.join(", "),
            totalTopics: allTopics.length,
            examDate: exam?.exam_date ? new Date(exam.exam_date + "T00:00:00") : undefined,
            selected: remaining.length > 0,
          };
        });

        setSubjects(loaded);
      } catch { /* silent */ }
      setDataLoading(false);
    }
    load();
    loadSavedPlans();
  }, []);

  // Auto-load most recent plan on mount
  useEffect(() => {
    async function loadRecent() {
      const { data } = await supabase
        .from("study_plans")
        .select("id, plan_data")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setPlan(data.plan_data as any);
        setActivePlanId(data.id);
      }
    }
    loadRecent();
  }, []);

  const loadSavedPlans = async () => {
    const { data } = await supabase
      .from("study_plans")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setSavedPlans(data as any[]);
  };

  const loadPlan = async (id: string) => {
    const { data } = await supabase.from("study_plans").select("id, plan_data, difficulty, daily_hours").eq("id", id).single();
    if (data) {
      setPlan(data.plan_data as any);
      setActivePlanId(data.id);
      setDifficulty((data.difficulty as string) || "balanced");
      setDailyHours(Number(data.daily_hours) || 4);
      setShowSaved(false);
      toast.success("Plan loaded!");
    }
  };

  const deleteSavedPlan = async (id: string) => {
    await supabase.from("study_plans").delete().eq("id", id);
    setSavedPlans(p => p.filter(x => x.id !== id));
    if (activePlanId === id) { setPlan(null); setActivePlanId(null); }
    toast.success("Plan deleted");
  };

  const toggleSubject = (idx: number) => {
    const copy = [...subjects];
    copy[idx].selected = !copy[idx].selected;
    setSubjects(copy);
  };

  const updateTopics = (idx: number, value: string) => {
    const copy = [...subjects];
    copy[idx].topicsRemaining = value;
    setSubjects(copy);
  };

  const updateExamDate = (idx: number, date: Date | undefined) => {
    const copy = [...subjects];
    copy[idx].examDate = date;
    setSubjects(copy);
  };

  const generate = async () => {
    const selected = subjects.filter(s => s.selected && s.topicsRemaining.trim());
    if (!selected.length) { toast.error("Select at least one subject with topics remaining."); return; }

    setLoading(true);
    setPlan(null);
    setActivePlanId(null);

    try {
      const payload = selected.map(s => ({
        name: s.name,
        topics: s.topicsRemaining.split(",").map(t => t.trim()).filter(Boolean),
        examDate: s.examDate ? format(s.examDate, "yyyy-MM-dd") : "",
      }));

      const resp = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ type: "studyplan", subjects: payload, dailyHours, difficulty }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      const planData: PlanDay[] = (data.plan || []).map((d: PlanDay) => ({
        ...d,
        tasks: d.tasks.map(t => ({ ...t, completed: false })),
      }));
      setPlan(planData);
      toast.success("Study plan generated!");

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const title = `Plan - ${format(new Date(), "dd MMM yyyy, HH:mm")}`;
        const { data: inserted } = await supabase.from("study_plans").insert({
          user_id: user.id,
          title,
          plan_data: planData as any,
          difficulty,
          daily_hours: dailyHours,
        }).select("id").single();
        if (inserted) setActivePlanId(inserted.id);
        loadSavedPlans();
      }

      setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (dayIdx: number, taskIdx: number) => {
    if (!plan) return;
    const copy = [...plan];
    copy[dayIdx] = {
      ...copy[dayIdx],
      tasks: copy[dayIdx].tasks.map((t, i) => i === taskIdx ? { ...t, completed: !t.completed } : t),
    };
    setPlan(copy);

    // Persist to DB
    if (activePlanId) {
      await supabase.from("study_plans").update({ plan_data: copy as any }).eq("id", activePlanId);
    }
  };

  const exportPDF = () => {
    if (!plan) return;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Study Plan</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
    h1 { color: #6366f1; font-size: 22px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #6366f1; color: white; padding: 8px 12px; text-align: left; }
    td { padding: 6px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .completed { text-decoration: line-through; opacity: 0.5; }
    .revision { background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .today { background: #ede9fe; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>📚 Study Plan</h1>
  <div class="meta">Generated: ${format(new Date(), "dd MMM yyyy")} · Difficulty: ${difficulty} · Daily Hours: ${dailyHours}h</div>
  <table>
    <thead><tr><th>✓</th><th>Date</th><th>Day</th><th>Subject</th><th>Topic</th><th>Hours</th><th>Revision</th></tr></thead>
    <tbody>
      ${plan.flatMap(d => d.tasks.map((t, i) => {
        const isToday = d.date === new Date().toISOString().slice(0, 10);
        return `<tr class="${t.completed ? "completed" : ""} ${isToday ? "today" : ""}">
          <td>${t.completed ? "☑" : "☐"}</td>
          <td>${i === 0 ? d.date : ""}</td>
          <td>${i === 0 ? d.day : ""}</td>
          <td>${t.subject}</td>
          <td>${t.topic}</td>
          <td>${t.hours}h</td>
          <td>${t.isRevision ? '<span class="revision">🔁 Revision</span>' : ""}</td>
        </tr>`;
      })).join("")}
    </tbody>
  </table>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
    toast.success("PDF export opened — use Print > Save as PDF");
  };

  const completedTasks = plan ? plan.reduce((a, d) => a + d.tasks.filter(t => t.completed).length, 0) : 0;
  const totalTasks = plan ? plan.reduce((a, d) => a + d.tasks.length, 0) : 0;
  const totalHours = plan ? plan.reduce((a, d) => a + d.tasks.reduce((b, t) => b + t.hours, 0), 0) : 0;

  const subjectColors: Record<string, string> = {};
  const palette = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
  let colorIdx = 0;
  const getColor = (name: string) => {
    if (!subjectColors[name]) { subjectColors[name] = palette[colorIdx % palette.length]; colorIdx++; }
    return subjectColors[name];
  };

  if (dataLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Study Plan Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Powered by AI · Personalized for your goals</p>
          </div>
          <div className="flex gap-2">
            {plan && (
              <>
                <Button variant="outline" size="sm" onClick={exportPDF}>
                  <Download className="w-4 h-4 mr-1" /> Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
                  <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Regenerate
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowSaved(!showSaved)}>
              {showSaved ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              Saved ({savedPlans.length})
            </Button>
          </div>
        </div>

        {/* Saved plans */}
        {showSaved && (
          <Card>
            <CardContent className="py-3">
              {savedPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No saved plans yet</p>
              ) : (
                <div className="space-y-2">
                  {savedPlans.map(sp => (
                    <div key={sp.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <button onClick={() => loadPlan(sp.id)} className="text-primary hover:underline flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {sp.title}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(sp.created_at).toLocaleDateString()}</span>
                        {activePlanId === sp.id && <Badge variant="default" className="text-[10px] h-5">Active</Badge>}
                        <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => deleteSavedPlan(sp.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Subject Selection with topics + exam date */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Select Subjects & Configure
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects found. Add subjects in Subject Management first.</p>
            ) : (
              subjects.map((s, i) => (
                <div key={s.id} className={cn(
                  "p-3 rounded-lg border transition-colors",
                  s.selected ? "border-primary/30 bg-primary/5" : "border-border"
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <Checkbox checked={s.selected} onCheckedChange={() => toggleSubject(i)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.totalTopics} total topics in database</p>
                    </div>
                    {!s.topicsRemaining.trim() && (
                      <Badge variant="secondary" className="text-[10px]">No topics</Badge>
                    )}
                  </div>

                  {s.selected && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mt-2 pl-8">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Topics remaining (comma separated)</label>
                        <Input
                          value={s.topicsRemaining}
                          onChange={e => updateTopics(i, e.target.value)}
                          placeholder="e.g. KCL, KVL, Star-Delta, Transformers"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Exam Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-8 w-[160px] justify-start text-left text-xs font-normal",
                                !s.examDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="w-3 h-3 mr-1.5" />
                              {s.examDate ? format(s.examDate, "dd MMM yyyy") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={s.examDate}
                              onSelect={(date) => updateExamDate(i, date)}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4">
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" /> Daily Study Hours: <span className="text-primary font-bold">{dailyHours}h</span>
              </label>
              <Slider value={[dailyHours]} onValueChange={([v]) => setDailyHours(v)} min={1} max={8} step={0.5} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1h</span><span>4h</span><span>8h</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <label className="text-sm font-medium text-foreground mb-3 block">Study Intensity</label>
              <div className="flex gap-2">
                {(["relaxed", "balanced", "intensive"] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all",
                      difficulty === d
                        ? "gradient-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-secondary-foreground hover:bg-muted"
                    )}
                  >
                    {d === "relaxed" ? "😌 Relaxed" : d === "balanced" ? "⚖️ Balanced" : "🔥 Intensive"}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Button */}
        <Button onClick={generate} disabled={loading} className="w-full h-11 text-sm font-semibold">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {loading ? "Generating Study Plan with Gemini..." : "Generate Study Plan"}
        </Button>

        {/* Generated Plan as Table */}
        {plan && (
          <div ref={planRef} className="space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Your Study Plan</h2>
              <div className="flex items-center gap-4">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{plan.length}</span> days ·
                  <span className="font-medium text-foreground ml-1">{totalHours}</span> total hours
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks}</span>
                  <Progress value={totalTasks ? (completedTasks / totalTasks) * 100 : 0} className="w-28 h-2" />
                </div>
              </div>
            </div>

            {/* Table View */}
            <Card>
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">✓</TableHead>
                      <TableHead className="w-28">Date</TableHead>
                      <TableHead className="w-20">Day</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Topics to Cover</TableHead>
                      <TableHead className="w-16 text-center">Hours</TableHead>
                      <TableHead className="w-20 text-center">Revision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.flatMap((day, di) =>
                      day.tasks.map((task, ti) => {
                        const isToday = day.date === new Date().toISOString().slice(0, 10);
                        const isFirstRow = ti === 0;
                        return (
                          <TableRow
                            key={`${di}-${ti}`}
                            className={cn(
                              task.completed && "opacity-50",
                              isToday && "bg-primary/5",
                            )}
                          >
                            <TableCell>
                              <Checkbox
                                checked={!!task.completed}
                                onCheckedChange={() => toggleTask(di, ti)}
                              />
                            </TableCell>
                            <TableCell className={cn("text-xs", !isFirstRow && "text-transparent select-none")}>
                              {isFirstRow && (
                                <div className="flex items-center gap-1">
                                  {day.date}
                                  {isToday && <Badge variant="default" className="text-[9px] h-4 ml-1">Today</Badge>}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className={cn("text-xs font-medium", !isFirstRow && "text-transparent select-none")}>
                              {isFirstRow ? day.day : ""}
                              {isFirstRow && day.note && (
                                <p className="text-[10px] text-muted-foreground font-normal">{day.note}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: getColor(task.subject) }}
                                />
                                <span className={cn("text-xs font-medium", task.completed && "line-through")}>
                                  {task.subject}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn("text-xs text-muted-foreground", task.completed && "line-through")}>
                                {task.topic}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-xs">{task.hours}h</span>
                            </TableCell>
                            <TableCell className="text-center">
                              {task.isRevision && (
                                <Badge variant="outline" className="text-[9px] h-4">🔁 Revision</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
