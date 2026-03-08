import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";

type GradeResult = {
  score: number;
  maxScore: number;
  correctPoints: string[];
  missingPoints: string[];
  improvements: string[];
  overallFeedback: string;
  modelAnswer?: string;
};

export default function AIAnswerChecker() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from("subjects").select("id, name").eq("user_id", user.id).then(({ data }) => {
        if (data) setSubjects(data);
      });
    }
  }, [user]);

  const checkAnswer = async () => {
    if (!question.trim() || !answer.trim()) {
      toast({ title: "Required", description: "Enter both question and answer", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const subName = subjects.find(s => s.id === selectedSubject)?.name || "";
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "answercheck", question, answer, subject: subName }),
      });
      if (!resp.ok) throw new Error("Failed to check answer");
      const data: GradeResult = await resp.json();
      setResult(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-500";
    if (score >= 5) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Answer Checker</h1>
          <p className="text-muted-foreground">Get your answers graded with detailed feedback</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Subject (optional)</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Question</label>
              <Textarea placeholder="Enter the question..." value={question} onChange={e => setQuestion(e.target.value)} className="min-h-[80px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Your Answer</label>
              <Textarea placeholder="Write your answer here..." value={answer} onChange={e => setAnswer(e.target.value)} className="min-h-[150px]" />
            </div>
            <Button className="w-full" onClick={checkAnswer} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : <><Sparkles className="w-4 h-4 mr-2" /> Check Answer</>}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            {/* Score Card */}
            <Card className="border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <p className={`text-6xl font-bold ${getScoreColor(result.score)}`}>{result.score}</p>
                  <p className="text-muted-foreground">out of {result.maxScore}</p>
                  <Progress value={(result.score / result.maxScore) * 100} className="max-w-xs mx-auto" />
                  <p className="text-sm text-foreground">{result.overallFeedback}</p>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Correct</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.correctPoints.map((p, i) => <li key={i} className="text-sm text-muted-foreground">• {p}</li>)}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Missing</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.missingPoints.map((p, i) => <li key={i} className="text-sm text-muted-foreground">• {p}</li>)}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-yellow-500" /> Improve</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.improvements.map((p, i) => <li key={i} className="text-sm text-muted-foreground">• {p}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {result.modelAnswer && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Model Answer</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.modelAnswer}</p></CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
