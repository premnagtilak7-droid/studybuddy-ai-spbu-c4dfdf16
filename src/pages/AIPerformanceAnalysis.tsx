import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Target, AlertTriangle, Loader2, RefreshCw, Sparkles, BookOpen, Trophy } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TestResult = {
  id: string;
  subject: string;
  topic: string | null;
  score: number | null;
  total: number | null;
  created_at: string;
  question_type: string;
};

type AnalysisResult = {
  overallScore: number;
  subjectWise: { subject: string; avgScore: number; totalTests: number; trend: "improving" | "declining" | "stable" }[];
  weakTopics: { subject: string; topic: string; score: number; suggestion: string }[];
  predictedScore: string;
  recommendations: string[];
  comparisonToIdeal: number;
};

const GEMINI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;

export default function AIPerformanceAnalysis() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [educationType, setEducationType] = useState<string | null>(null);
  const [examName, setExamName] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [testsRes, profileRes] = await Promise.all([
        supabase.from("mock_tests").select("id, subject, topic, score, total, created_at, question_type")
          .eq("user_id", user.id).not("score", "is", null).order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("education_type, education_details").eq("user_id", user.id).single(),
      ]);

      setTests((testsRes.data || []) as TestResult[]);
      if (profileRes.data) {
        setEducationType(profileRes.data.education_type);
        const details = profileRes.data.education_details as any;
        setExamName(details?.exam_name || null);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function runAnalysis() {
    if (tests.length === 0) {
      toast.error("Take some mock tests first to get analysis!");
      return;
    }

    setAnalyzing(true);
    try {
      const resp = await fetch(GEMINI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "performance",
          tests: tests.map(t => ({
            subject: t.subject,
            topic: t.topic,
            score: t.score,
            total: t.total,
            date: t.created_at,
            questionType: t.question_type,
          })),
          educationType,
          examName,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      setAnalysis(data);
      toast.success("Analysis complete!");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    }
    setAnalyzing(false);
  }

  // Calculate basic stats from tests
  const overallAvg = tests.length > 0
    ? Math.round(tests.reduce((a, t) => a + ((t.score || 0) / (t.total || 1)) * 100, 0) / tests.length)
    : 0;

  const subjectMap = new Map<string, { scores: number[]; count: number }>();
  tests.forEach(t => {
    const key = t.subject;
    const existing = subjectMap.get(key) || { scores: [], count: 0 };
    existing.scores.push(((t.score || 0) / (t.total || 1)) * 100);
    existing.count++;
    subjectMap.set(key, existing);
  });

  const subjectStats = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    totalTests: data.count,
  }));

  if (loading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              AI Performance Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analyze your mock test results and get personalized insights
            </p>
          </div>
          <Button onClick={runAnalysis} disabled={analyzing || tests.length === 0} className="gap-2">
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold text-foreground">{tests.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Average Score</p>
              <p className="text-2xl font-bold text-foreground">{overallAvg}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Subjects Tested</p>
              <p className="text-2xl font-bold text-foreground">{subjectStats.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Best Subject</p>
              <p className="text-lg font-bold text-foreground truncate">
                {subjectStats.sort((a, b) => b.avgScore - a.avgScore)[0]?.subject || "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subject Breakdown */}
        {subjectStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Subject-wise Performance
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjectStats.sort((a, b) => b.avgScore - a.avgScore).map((s) => (
                <div key={s.subject} className="flex items-center gap-3">
                  <div className="w-32 truncate text-sm font-medium text-foreground">{s.subject}</div>
                  <div className="flex-1">
                    <Progress value={s.avgScore} className="h-2.5" />
                  </div>
                  <div className="w-16 text-right">
                    <span className={`text-sm font-bold ${s.avgScore >= 70 ? "text-green-600" : s.avgScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>
                      {s.avgScore}%
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{s.totalTests} tests</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Results */}
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Score Prediction */}
            <Card className="border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Predicted Performance</h3>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.predictedScore}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Preparation Level:</span>
                  <Progress value={analysis.comparisonToIdeal} className="flex-1 h-2" />
                  <span className="text-xs font-bold text-foreground">{analysis.comparisonToIdeal}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Weak Topics */}
            {analysis.weakTopics.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" /> Weak Areas — Need Revision
                  </h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.weakTopics.map((t, i) => (
                    <div key={i} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground">{t.subject} — {t.topic}</p>
                        <Badge variant="destructive" className="text-[10px]">{t.score}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.suggestion}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Personalized Recommendations
                  </h3>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {tests.length === 0 && (
          <Card className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Test Data Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Take some AI Mock Tests first. Once you have results, come back here for AI-powered analysis of your strengths and weaknesses.
            </p>
            <Button onClick={() => window.location.href = "/mock-test"}>Go to Mock Tests</Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}