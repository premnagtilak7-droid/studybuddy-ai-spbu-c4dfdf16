import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock, CheckCircle2, XCircle, Trophy, RotateCcw, FileText, AlertTriangle, BarChart3 } from "lucide-react";

type Question = {
  id: number;
  type: "mcq" | "theory";
  question: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  modelAnswer?: string;
  negativeMarks?: number;
  difficulty?: string;
  timeEstimate?: string;
  section?: string;
};

type TestMeta = {
  totalMarks?: number;
  duration?: string;
  negativeMarking?: boolean;
  examPattern?: string;
};

type TestState = "config" | "loading" | "test" | "results";

export default function AIMockTest() {
  const { user } = useAuth();
  const [state, setState] = useState<TestState>("config");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState("10");
  const [questionType, setQuestionType] = useState("mixed");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testMeta, setTestMeta] = useState<TestMeta>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [score, setScore] = useState(0);
  const [negativeScore, setNegativeScore] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [educationType, setEducationType] = useState("");
  const [examName, setExamName] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [board, setBoard] = useState("");

  useEffect(() => {
    if (user) {
      supabase.from("subjects").select("id, name, code").eq("user_id", user.id).then(({ data }) => {
        if (data) setSubjects(data);
      });
      supabase.from("mock_tests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10).then(({ data }) => {
        if (data) setHistory(data);
      });
      // Load education profile
      supabase.from("profiles").select("education_type, education_details").eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setEducationType((data as any).education_type || "");
          const details = (data as any).education_details || {};
          setExamName(details.exam_name || "");
          setClassLevel(details.class_level || "");
          setBoard(details.board || "");
        }
      });
    }
  }, [user]);

  // Timer
  useEffect(() => {
    if (state !== "test" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { handleSubmit(); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [state, timeLeft]);

  // Get exam-specific question type options
  const getQuestionTypes = () => {
    if (educationType === "competitive_exam") {
      switch (examName) {
        case "JEE": return [{ value: "mcq", label: "MCQ (JEE Pattern)" }, { value: "theory", label: "Numerical" }, { value: "mixed", label: "Mixed" }];
        case "NEET": return [{ value: "mcq", label: "MCQ (NEET Pattern)" }];
        case "UPSC": return [{ value: "mcq", label: "Prelims MCQ" }, { value: "theory", label: "Mains Descriptive" }, { value: "mixed", label: "Mixed" }];
        case "CAT": return [{ value: "mcq", label: "MCQ with Timer" }, { value: "mixed", label: "Mixed Set" }];
        case "SSC":
        case "Banking": return [{ value: "mcq", label: "Section-wise MCQ" }, { value: "mixed", label: "Mixed" }];
        case "GATE": return [{ value: "mcq", label: "MCQ" }, { value: "theory", label: "NAT (Numerical)" }, { value: "mixed", label: "Mixed" }];
      }
    }
    return [{ value: "mcq", label: "MCQ Only" }, { value: "theory", label: "Theory Only" }, { value: "mixed", label: "Mixed" }];
  };

  const generateTest = async () => {
    setState("loading");
    try {
      const subName = subjects.find(s => s.id === selectedSubject)?.name || selectedSubject;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          type: "mocktest",
          subject: subName,
          topic,
          numQuestions: parseInt(numQuestions),
          questionType,
          educationType,
          examName,
          classLevel,
          board,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed to generate test" }));
        throw new Error(err.error || "Failed to generate test");
      }
      const data = await resp.json();
      setQuestions(data.questions || []);
      setTestMeta(data.testMeta || {});
      setUserAnswers({});
      const time = parseInt(numQuestions) * (examName === "CAT" ? 120 : 90);
      setTimeLeft(time);
      setTotalTime(time);
      setState("test");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setState("config");
    }
  };

  const handleSubmit = useCallback(async () => {
    let correct = 0;
    let negMarks = 0;
    questions.forEach(q => {
      if (q.type === "mcq") {
        if (userAnswers[q.id] === q.correctAnswer) {
          correct++;
        } else if (userAnswers[q.id] && q.negativeMarks) {
          negMarks += q.negativeMarks;
        }
      }
    });
    setScore(correct);
    setNegativeScore(negMarks);
    setState("results");

    if (user) {
      const subName = subjects.find(s => s.id === selectedSubject)?.name || selectedSubject;
      await supabase.from("mock_tests").insert({
        user_id: user.id,
        subject: subName,
        topic,
        question_type: questionType,
        num_questions: questions.length,
        questions: questions as any,
        answers: userAnswers as any,
        score: correct,
        total: questions.filter(q => q.type === "mcq").length,
        duration_seconds: totalTime - timeLeft,
        completed_at: new Date().toISOString(),
      });
    }
  }, [questions, userAnswers, user, selectedSubject, subjects, topic, questionType, totalTime, timeLeft]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const mcqCount = questions.filter(q => q.type === "mcq").length;

  // Weak area analysis
  const getWeakAreas = () => {
    const sectionScores: Record<string, { correct: number; total: number }> = {};
    const difficultyScores: Record<string, { correct: number; total: number }> = {};
    
    questions.forEach(q => {
      if (q.type !== "mcq") return;
      const section = q.section || "General";
      const diff = q.difficulty || "medium";
      
      if (!sectionScores[section]) sectionScores[section] = { correct: 0, total: 0 };
      if (!difficultyScores[diff]) difficultyScores[diff] = { correct: 0, total: 0 };
      
      sectionScores[section].total++;
      difficultyScores[diff].total++;
      
      if (userAnswers[q.id] === q.correctAnswer) {
        sectionScores[section].correct++;
        difficultyScores[diff].correct++;
      }
    });

    return { sectionScores, difficultyScores };
  };

  // Get exam-specific header
  const getExamLabel = () => {
    if (educationType === "competitive_exam" && examName) return `${examName} Mock Test`;
    if (educationType === "school") return `Class ${classLevel || ""} ${board || ""} Practice Test`;
    return "AI Mock Test Generator";
  };

  if (state === "loading") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">AI is generating your {examName || ""} test...</p>
        </div>
      </AppLayout>
    );
  }

  if (state === "results") {
    const { sectionScores, difficultyScores } = getWeakAreas();
    const hasNegative = negativeScore > 0;

    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Trophy className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle className="text-2xl">Test Complete!</CardTitle>
              <CardDescription>Time taken: {fmt(totalTime - timeLeft)}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {mcqCount > 0 && (
                <div>
                  <p className="text-4xl font-bold text-primary">{score}/{mcqCount}</p>
                  <p className="text-muted-foreground">MCQ Score ({Math.round((score / mcqCount) * 100)}%)</p>
                  {hasNegative && (
                    <p className="text-sm text-destructive mt-1">Negative marks: -{negativeScore}</p>
                  )}
                  <Progress value={(score / mcqCount) * 100} className="mt-2 max-w-xs mx-auto" />
                </div>
              )}
              <Button onClick={() => { setState("config"); setQuestions([]); setTestMeta({}); }}>
                <RotateCcw className="w-4 h-4 mr-2" /> Take Another Test
              </Button>
            </CardContent>
          </Card>

          {/* Test Analysis */}
          {mcqCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Test Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Section-wise Analysis */}
                {Object.keys(sectionScores).length > 1 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Section-wise Performance</p>
                    <div className="space-y-2">
                      {Object.entries(sectionScores).map(([section, { correct, total }]) => {
                        const pct = Math.round((correct / total) * 100);
                        const isWeak = pct < 50;
                        return (
                          <div key={section} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-24 truncate">{section}</span>
                            <Progress value={pct} className="flex-1 h-2" />
                            <span className={`text-xs font-mono ${isWeak ? "text-destructive" : "text-foreground"}`}>
                              {correct}/{total}
                            </span>
                            {isWeak && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Difficulty-wise Analysis */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Difficulty Breakdown</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["easy", "medium", "hard"].map(diff => {
                      const d = difficultyScores[diff];
                      if (!d) return null;
                      const pct = Math.round((d.correct / d.total) * 100);
                      return (
                        <div key={diff} className="p-3 rounded-lg bg-secondary/50 text-center">
                          <p className="text-xs capitalize text-muted-foreground">{diff}</p>
                          <p className="text-lg font-bold font-mono text-foreground">{d.correct}/{d.total}</p>
                          <p className="text-xs font-mono text-muted-foreground">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weak Areas */}
                {Object.entries(sectionScores).filter(([, { correct, total }]) => (correct / total) < 0.5).length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-1">⚠️ Weak Areas to Focus On:</p>
                    <ul className="text-xs text-destructive/80 space-y-1">
                      {Object.entries(sectionScores)
                        .filter(([, { correct, total }]) => (correct / total) < 0.5)
                        .map(([section]) => <li key={section}>• {section}</li>)
                      }
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {questions.map((q, i) => (
            <Card key={q.id} className={q.type === "mcq" ? (userAnswers[q.id] === q.correctAnswer ? "border-green-500/30" : "border-destructive/30") : ""}>
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={q.type === "mcq" ? "default" : "secondary"}>{q.type.toUpperCase()}</Badge>
                  <Badge variant="outline">{q.marks} marks</Badge>
                  {q.difficulty && <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>}
                  {q.section && <Badge variant="outline">{q.section}</Badge>}
                  {q.negativeMarks && <Badge variant="destructive" className="text-xs">-{q.negativeMarks} neg</Badge>}
                  {q.type === "mcq" && (
                    userAnswers[q.id] === q.correctAnswer
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <CardTitle className="text-base mt-2">Q{i + 1}. {q.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options?.map((opt, oi) => (
                  <div key={oi} className={`p-2 rounded text-sm ${opt === q.correctAnswer ? "bg-green-500/10 text-green-700 dark:text-green-400 font-medium" : userAnswers[q.id] === opt ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}>
                    {String.fromCharCode(65 + oi)}) {opt}
                  </div>
                ))}
                {q.explanation && <p className="text-sm text-muted-foreground mt-2"><strong>Explanation:</strong> {q.explanation}</p>}
                {q.modelAnswer && <p className="text-sm text-muted-foreground mt-2"><strong>Model Answer:</strong> {q.modelAnswer}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  if (state === "test") {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 flex items-center justify-between border-b">
            <div>
              <span className="font-medium">{questions.length} Questions</span>
              {testMeta.negativeMarking && <Badge variant="destructive" className="ml-2 text-xs">Negative Marking</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className={`font-mono font-bold ${timeLeft < 60 ? "text-destructive" : "text-primary"}`}>{fmt(timeLeft)}</span>
            </div>
            <Button onClick={handleSubmit} size="sm">Submit Test</Button>
          </div>

          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={q.type === "mcq" ? "default" : "secondary"}>{q.type.toUpperCase()}</Badge>
                  <Badge variant="outline">{q.marks} marks</Badge>
                  {q.difficulty && <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>}
                  {q.section && <Badge variant="outline">{q.section}</Badge>}
                  {q.timeEstimate && <span className="text-xs text-muted-foreground">⏱ {q.timeEstimate}</span>}
                </div>
                <CardTitle className="text-base mt-2">Q{i + 1}. {q.question}</CardTitle>
              </CardHeader>
              <CardContent>
                {q.type === "mcq" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setUserAnswers(p => ({ ...p, [q.id]: opt }))}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${userAnswers[q.id] === opt ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent"}`}
                      >
                        {String.fromCharCode(65 + oi)}) {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm resize-y"
                    placeholder="Write your answer..."
                    value={userAnswers[q.id] || ""}
                    onChange={e => setUserAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <div className="text-center py-4">
            <Button onClick={handleSubmit} size="lg">Submit Test</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Config state
  const qTypes = getQuestionTypes();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{getExamLabel()}</h1>
          <p className="text-muted-foreground">
            {educationType === "competitive_exam" && examName
              ? `Generate ${examName}-pattern practice tests powered by AI`
              : "Generate practice tests powered by AI"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configure Test</CardTitle>
            {educationType === "competitive_exam" && examName && (
              <CardDescription>
                Questions will follow {examName} exam pattern
                {(examName === "JEE" || examName === "NEET" || examName === "GATE") && " with negative marking"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
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
              <label className="text-sm font-medium text-foreground">Topic (optional)</label>
              <Input placeholder="e.g. Kinematics, Organic Chemistry..." value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Questions</label>
                <Select value={numQuestions} onValueChange={setNumQuestions}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="20">20 Questions</SelectItem>
                    <SelectItem value="30">30 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Type</label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {qTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={generateTest} disabled={!selectedSubject}>
              <FileText className="w-4 h-4 mr-2" /> Generate {examName || "Mock"} Test
            </Button>
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Tests</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{h.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString()} · {h.question_type}</p>
                    </div>
                    <Badge variant={h.score !== null ? (h.score / h.total >= 0.7 ? "default" : "destructive") : "secondary"}>
                      {h.score !== null ? `${h.score}/${h.total}` : "Incomplete"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
