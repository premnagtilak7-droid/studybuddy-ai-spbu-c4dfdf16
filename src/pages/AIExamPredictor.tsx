import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Target, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

type Prediction = {
  topic: string;
  importance: "critical" | "high" | "medium" | "low";
  reason: string;
  likelyMarks?: number;
  questionType?: string;
};

type PredictionResult = {
  importantTopics: Prediction[];
  studyStrategy: string;
  timeAllocation?: string;
};

const importanceConfig: Record<string, { color: string; icon: any }> = {
  critical: { color: "bg-destructive text-destructive-foreground", icon: AlertTriangle },
  high: { color: "bg-primary text-primary-foreground", icon: TrendingUp },
  medium: { color: "bg-yellow-500 text-white", icon: Target },
  low: { color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

export default function AIExamPredictor() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from("subjects").select("id, name, code").eq("user_id", user.id).then(({ data }) => {
        if (data) setSubjects(data);
      });
    }
  }, [user]);

  const predict = async () => {
    if (!selectedSubject || !examDate) {
      toast({ title: "Required", description: "Select subject and exam date", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const subName = subjects.find(s => s.id === selectedSubject)?.name || "";

      // Get completed topics for this subject
      const { data: unitsData } = await supabase.from("units").select("id").eq("subject_id", selectedSubject);
      const unitIds = unitsData?.map(u => u.id) || [];
      let completedTopics: string[] = [];
      if (unitIds.length > 0) {
        const { data: topicsData } = await supabase.from("topics").select("name").in("unit_id", unitIds).eq("is_completed", true);
        completedTopics = topicsData?.map(t => t.name) || [];
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "exampredict", subject: subName, examDate, completedTopics }),
      });
      if (!resp.ok) throw new Error("Failed to predict");
      const data: PredictionResult = await resp.json();
      setResult(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Exam Predictor</h1>
          <p className="text-muted-foreground">Predict important topics and question types for your exam</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Exam Date</label>
              <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
            <Button className="w-full" onClick={predict} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Target className="w-4 h-4 mr-2" /> Predict Important Topics</>}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            {result.studyStrategy && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Study Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.studyStrategy}</p>
                  {result.timeAllocation && <p className="text-sm text-muted-foreground mt-3"><strong>Time Allocation:</strong> {result.timeAllocation}</p>}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-lg">Predicted Topics (Priority Order)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.importantTopics.map((t, i) => {
                  const cfg = importanceConfig[t.importance] || importanceConfig.medium;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{t.topic}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t.reason}</p>
                            {t.questionType && <p className="text-xs text-muted-foreground mt-1">Likely: {t.questionType}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {t.likelyMarks && <Badge variant="outline">{t.likelyMarks}m</Badge>}
                          <Badge className={cfg.color}>{t.importance}</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
