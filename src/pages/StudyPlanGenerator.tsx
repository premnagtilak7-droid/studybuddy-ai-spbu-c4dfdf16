import { useState, useEffect } from "react";
import { Plus, Trash2, Sparkles, Calendar, BookOpen, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SubjectInput = {
  name: string;
  topics: string[];
  examDate: string;
};

type PlanTask = {
  subject: string;
  topic: string;
  hours: number;
};

type PlanDay = {
  date: string;
  day: string;
  tasks: PlanTask[];
  note?: string;
};

export default function StudyPlanGenerator() {
  const [subjects, setSubjects] = useState<SubjectInput[]>([
    { name: "", topics: [""], examDate: "" },
  ]);
  const [plan, setPlan] = useState<PlanDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Auto-load from database
  useEffect(() => {
    async function load() {
      try {
        const { data: dbSubjects } = await supabase.from("subjects").select("id, name");
        if (!dbSubjects?.length) return;

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
          const remaining = (topics || [])
            .filter((t) => sUnitIds.includes(t.unit_id) && !t.is_completed)
            .map((t) => t.name);
          const exam = (examDates || []).find((e) => e.subject_id === s.id);
          return {
            name: s.name,
            topics: remaining.length ? remaining : [""],
            examDate: exam?.exam_date || "",
          };
        });

        if (loaded.length) {
          setSubjects(loaded);
          setAutoLoaded(true);
        }
      } catch {
        // silent
      }
    }
    load();
  }, []);

  const addSubject = () => {
    setSubjects([...subjects, { name: "", topics: [""], examDate: "" }]);
  };

  const removeSubject = (i: number) => {
    setSubjects(subjects.filter((_, idx) => idx !== i));
  };

  const updateSubject = (i: number, field: keyof SubjectInput, value: string) => {
    const copy = [...subjects];
    if (field === "topics") return;
    copy[i] = { ...copy[i], [field]: value };
    setSubjects(copy);
  };

  const addTopic = (si: number) => {
    const copy = [...subjects];
    copy[si].topics.push("");
    setSubjects(copy);
  };

  const updateTopic = (si: number, ti: number, value: string) => {
    const copy = [...subjects];
    copy[si].topics[ti] = value;
    setSubjects(copy);
  };

  const removeTopic = (si: number, ti: number) => {
    const copy = [...subjects];
    copy[si].topics = copy[si].topics.filter((_, idx) => idx !== ti);
    setSubjects(copy);
  };

  const generate = async () => {
    const valid = subjects.filter(
      (s) => s.name.trim() && s.examDate && s.topics.some((t) => t.trim())
    );
    if (!valid.length) {
      toast.error("Add at least one subject with topics and an exam date.");
      return;
    }

    setLoading(true);
    setPlan(null);

    try {
      const payload = valid.map((s) => ({
        name: s.name,
        topics: s.topics.filter((t) => t.trim()),
        examDate: s.examDate,
      }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-plan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ subjects: payload }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      setPlan(data.plan || []);
      toast.success("Study plan generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const subjectColors: Record<string, string> = {};
  const palette = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  let colorIdx = 0;
  const getColor = (name: string) => {
    if (!subjectColors[name]) {
      subjectColors[name] = palette[colorIdx % palette.length];
      colorIdx++;
    }
    return subjectColors[name];
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Study Plan Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Input your subjects, remaining topics, and exam dates — AI will create your optimal study schedule.
          </p>
        </div>

        {autoLoaded && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            ✨ Auto-loaded your subjects, remaining topics, and exam dates from the database.
          </div>
        )}

        {/* Subject inputs */}
        <div className="space-y-4">
          {subjects.map((subject, si) => (
            <Card key={si} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Subject name"
                    value={subject.name}
                    onChange={(e) => updateSubject(si, "name", e.target.value)}
                    className="h-8 text-sm font-medium"
                  />
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={subject.examDate}
                      onChange={(e) => updateSubject(si, "examDate", e.target.value)}
                      className="h-8 text-sm w-40"
                    />
                  </div>
                  {subjects.length > 1 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeSubject(si)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-2">Remaining topics:</p>
                <div className="flex flex-wrap gap-2">
                  {subject.topics.map((topic, ti) => (
                    <div key={ti} className="flex items-center gap-1">
                      <Input
                        placeholder={`Topic ${ti + 1}`}
                        value={topic}
                        onChange={(e) => updateTopic(si, ti, e.target.value)}
                        className="h-7 text-xs w-40"
                      />
                      {subject.topics.length > 1 && (
                        <button onClick={() => removeTopic(si, ti)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addTopic(si)}>
                    <Plus className="w-3 h-3 mr-1" /> Topic
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={addSubject}>
              <Plus className="w-4 h-4 mr-1" /> Add Subject
            </Button>
            <Button onClick={generate} disabled={loading} className="ml-auto">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {loading ? "Generating..." : "Generate Plan"}
            </Button>
          </div>
        </div>

        {/* Generated plan */}
        {plan && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Your Study Plan</h2>
            <ScrollArea className="h-[500px] pr-2">
              <div className="space-y-2">
                {plan.map((day, i) => {
                  const isToday = day.date === new Date().toISOString().slice(0, 10);
                  return (
                    <Card key={i} className={isToday ? "border-primary ring-1 ring-primary/30" : ""}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{day.day}</span>
                            <span className="text-xs text-muted-foreground">{day.date}</span>
                            {isToday && <Badge variant="default" className="text-[10px] h-5">Today</Badge>}
                          </div>
                          {day.note && (
                            <span className="text-[10px] text-muted-foreground italic">{day.note}</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {day.tasks.map((task, j) => (
                            <div key={j} className="flex items-center gap-2 text-xs">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getColor(task.subject) }}
                              />
                              <span className="font-medium text-foreground">{task.subject}</span>
                              <span className="text-muted-foreground">—</span>
                              <span className="text-muted-foreground flex-1">{task.topic}</span>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {task.hours}h
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
