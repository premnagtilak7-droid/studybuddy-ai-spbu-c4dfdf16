import { useState, useEffect, useRef } from "react";
import { Sparkles, Calendar, BookOpen, Clock, Loader2, Check, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SubjectInput = {
  id: string;
  name: string;
  topics: string[];
  totalTopics: number;
  examDate: string;
  selected: boolean;
};

type PlanTask = { subject: string; topic: string; hours: number; isRevision?: boolean; completed?: boolean };
type PlanDay = { date: string; day: string; tasks: PlanTask[]; note?: string };

const GEMINI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;

export default function StudyPlanGenerator() {
  const [subjects, setSubjects] = useState<SubjectInput[]>([]);
  const [plan, setPlan] = useState<PlanDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dailyHours, setDailyHours] = useState(4);
  const [difficulty, setDifficulty] = useState("balanced");
  const [savedPlans, setSavedPlans] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [showSaved, setShowSaved] = useState(false);

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
            topics: remaining.length ? remaining : [],
            totalTopics: allTopics.length,
            examDate: exam?.exam_date || "",
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

  const loadSavedPlans = async () => {
    const { data } = await supabase
      .from("study_plans")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setSavedPlans(data as any[]);
  };

  const loadPlan = async (id: string) => {
    const { data } = await supabase.from("study_plans").select("plan_data").eq("id", id).single();
    if (data) {
      setPlan(data.plan_data as any);
      setShowSaved(false);
      toast.success("Plan loaded!");
    }
  };

  const deleteSavedPlan = async (id: string) => {
    await supabase.from("study_plans").delete().eq("id", id);
    setSavedPlans(p => p.filter(x => x.id !== id));
    toast.success("Plan deleted");
  };

  const toggleSubject = (idx: number) => {
    const copy = [...subjects];
    copy[idx].selected = !copy[idx].selected;
    setSubjects(copy);
  };

  const generate = async () => {
    const selected = subjects.filter(s => s.selected && s.topics.length > 0);
    if (!selected.length) { toast.error("Select at least one subject with remaining topics."); return; }

    setLoading(true);
    setPlan(null);

    try {
      const payload = selected.map(s => ({
        name: s.name,
        topics: s.topics,
        examDate: s.examDate,
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
      const planData = (data.plan || []).map((d: PlanDay) => ({
        ...d,
        tasks: d.tasks.map(t => ({ ...t, completed: false })),
      }));
      setPlan(planData);
      toast.success("Study plan generated!");

      // Auto-save
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const title = `Plan - ${new Date().toLocaleDateString()}`;
        await supabase.from("study_plans").insert({
          user_id: user.id,
          title,
          plan_data: planData as any,
          difficulty,
          daily_hours: dailyHours,
        });
        loadSavedPlans();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (dayIdx: number, taskIdx: number) => {
    if (!plan) return;
    const copy = [...plan];
    copy[dayIdx] = {
      ...copy[dayIdx],
      tasks: copy[dayIdx].tasks.map((t, i) => i === taskIdx ? { ...t, completed: !t.completed } : t),
    };
    setPlan(copy);
  };

  const exportPDF = () => {
    if (!plan) return;
    // Create a printable table
    const rows = plan.flatMap(d =>
      d.tasks.map(t => `${d.date}\t${d.day}\t${t.subject}\t${t.topic}\t${t.hours}h\t${t.isRevision ? "✅" : ""}`)
    );
    const content = `SPPU Study Plan\nGenerated: ${new Date().toLocaleDateString()}\nDifficulty: ${difficulty} | Daily Hours: ${dailyHours}\n\nDate\tDay\tSubject\tTopic\tHours\tRevision\n${rows.join("\n")}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-plan-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Plan exported!");
  };

  const completedTasks = plan ? plan.reduce((a, d) => a + d.tasks.filter(t => t.completed).length, 0) : 0;
  const totalTasks = plan ? plan.reduce((a, d) => a + d.tasks.length, 0) : 0;

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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Study Plan Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Powered by Gemini · Select subjects & preferences</p>
          </div>
          <div className="flex gap-2">
            {plan && (
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowSaved(!showSaved)}>
              {showSaved ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              Saved ({savedPlans.length})
            </Button>
          </div>
        </div>

        {/* Saved plans dropdown */}
        {showSaved && savedPlans.length > 0 && (
          <Card>
            <CardContent className="py-3 space-y-2">
              {savedPlans.map(sp => (
                <div key={sp.id} className="flex items-center justify-between text-sm">
                  <button onClick={() => loadPlan(sp.id)} className="text-primary hover:underline">
                    {sp.title}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(sp.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => deleteSavedPlan(sp.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Subject selection */}
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Select Subjects
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects found. Add subjects first.</p>
            ) : (
              subjects.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox checked={s.selected} onCheckedChange={() => toggleSubject(i)} disabled={s.topics.length === 0} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.topics.length} remaining / {s.totalTopics} total topics
                      {s.examDate && ` · Exam: ${s.examDate}`}
                    </p>
                  </div>
                  {s.topics.length === 0 && (
                    <Badge variant="secondary" className="text-[10px]">All done</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4">
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" /> Daily Study Hours: {dailyHours}h
              </label>
              <Slider value={[dailyHours]} onValueChange={([v]) => setDailyHours(v)} min={1} max={8} step={0.5} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1h</span><span>8h</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <label className="text-sm font-medium text-foreground mb-3 block">Difficulty</label>
              <div className="flex gap-2">
                {["relaxed", "balanced", "intensive"].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all capitalize ${
                      difficulty === d
                        ? "gradient-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-muted"
                    }`}
                  >
                    {d === "relaxed" ? "😌 Relaxed" : d === "balanced" ? "⚖️ Balanced" : "🔥 Intensive"}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Button onClick={generate} disabled={loading} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {loading ? "Generating with Gemini..." : "Generate Study Plan"}
        </Button>

        {/* Generated plan */}
        {plan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Your Study Plan</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks} completed</span>
                <Progress value={totalTasks ? (completedTasks / totalTasks) * 100 : 0} className="w-32 h-2" />
              </div>
            </div>

            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-2">
                {plan.map((day, di) => {
                  const isToday = day.date === new Date().toISOString().slice(0, 10);
                  const dayCompleted = day.tasks.filter(t => t.completed).length;
                  return (
                    <Card key={di} className={isToday ? "border-primary ring-1 ring-primary/30" : ""}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{day.day}</span>
                            <span className="text-xs text-muted-foreground">{day.date}</span>
                            {isToday && <Badge variant="default" className="text-[10px] h-5">Today</Badge>}
                            {day.note && <Badge variant="secondary" className="text-[10px] h-5">{day.note}</Badge>}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{dayCompleted}/{day.tasks.length} done</span>
                        </div>
                        <div className="space-y-1.5">
                          {day.tasks.map((task, ti) => (
                            <div
                              key={ti}
                              className={`flex items-center gap-2 text-xs p-1.5 rounded transition-colors ${
                                task.completed ? "bg-muted/50 line-through opacity-60" : "hover:bg-muted/30"
                              }`}
                            >
                              <Checkbox checked={!!task.completed} onCheckedChange={() => toggleTask(di, ti)} />
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(task.subject) }} />
                              <span className="font-medium text-foreground">{task.subject}</span>
                              <span className="text-muted-foreground">—</span>
                              <span className="text-muted-foreground flex-1">{task.topic}</span>
                              {task.isRevision && <Badge variant="outline" className="text-[9px] h-4">🔁 Revision</Badge>}
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />{task.hours}h
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
