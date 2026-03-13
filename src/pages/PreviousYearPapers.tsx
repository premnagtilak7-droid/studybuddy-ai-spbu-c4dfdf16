import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Clock, FileText, BookOpen, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";

// PYQ data organized by exam type
const PYQ_CATALOG: Record<string, { years: number[]; sections: string[] }> = {
  JEE: { years: [2024, 2023, 2022, 2021, 2020], sections: ["Physics", "Chemistry", "Mathematics"] },
  NEET: { years: [2024, 2023, 2022, 2021, 2020], sections: ["Physics", "Chemistry", "Biology"] },
  UPSC: { years: [2024, 2023, 2022, 2021, 2020], sections: ["GS Paper 1", "GS Paper 2", "GS Paper 3", "GS Paper 4"] },
  CAT: { years: [2024, 2023, 2022, 2021, 2020], sections: ["Quant", "VARC", "DILR"] },
  GATE: { years: [2024, 2023, 2022, 2021, 2020], sections: ["General"] },
  SSC: { years: [2024, 2023, 2022, 2021], sections: ["Reasoning", "English", "Quant", "GK"] },
  Banking: { years: [2024, 2023, 2022, 2021], sections: ["Reasoning", "English", "Quant", "Banking Awareness"] },
};

type PYQQuestion = {
  id: number;
  type: "mcq" | "theory";
  question: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  modelAnswer?: string;
  year: number;
  section: string;
};

type ViewState = "browse" | "loading" | "test" | "results";

export default function PreviousYearPapers() {
  const { user } = useAuth();
  const [viewState, setViewState] = useState<ViewState>("browse");
  const [examName, setExamName] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [score, setScore] = useState(0);
  const [showSolutions, setShowSolutions] = useState(false);
  const [educationType, setEducationType] = useState("");

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("education_type, education_details").eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setEducationType((data as any).education_type || "");
          const details = (data as any).education_details || {};
          if (details.exam_name && PYQ_CATALOG[details.exam_name]) {
            setExamName(details.exam_name);
          }
        }
      });
    }
  }, [user]);

  // Timer
  useEffect(() => {
    if (viewState !== "test" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(p => { if (p <= 1) { handleSubmit(); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [viewState, timeLeft]);

  const generatePYQ = async () => {
    if (!examName || !selectedYear || !selectedSection) return;
    setViewState("loading");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          type: "mocktest",
          subject: selectedSection,
          topic: `Previous Year ${selectedYear} ${examName} paper questions`,
          numQuestions: 15,
          questionType: examName === "UPSC" ? "mixed" : "mcq",
          educationType: "competitive_exam",
          examName,
        }),
      });
      if (!resp.ok) throw new Error("Failed to generate PYQ");
      const data = await resp.json();
      const qs = (data.questions || []).map((q: any, i: number) => ({
        ...q,
        year: parseInt(selectedYear),
        section: selectedSection,
      }));
      setQuestions(qs);
      setUserAnswers({});
      const time = qs.length * 90;
      setTimeLeft(time);
      setTotalTime(time);
      setViewState("test");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setViewState("browse");
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach(q => {
      if (q.type === "mcq" && userAnswers[q.id] === q.correctAnswer) correct++;
    });
    setScore(correct);
    setShowSolutions(true);
    setViewState("results");
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const mcqCount = questions.filter(q => q.type === "mcq").length;
  const catalog = examName ? PYQ_CATALOG[examName] : null;
  const availableExams = Object.keys(PYQ_CATALOG);

  if (viewState === "loading") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">Generating {examName} {selectedYear} paper...</p>
        </div>
      </AppLayout>
    );
  }

  if (viewState === "results") {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="text-center">
              <Trophy className="w-12 h-12 mx-auto text-primary mb-2" />
              <CardTitle className="text-2xl">{examName} {selectedYear} — {selectedSection}</CardTitle>
              <CardDescription>Time taken: {fmt(totalTime - timeLeft)}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {mcqCount > 0 && (
                <div>
                  <p className="text-4xl font-bold text-primary">{score}/{mcqCount}</p>
                  <p className="text-muted-foreground">Score ({Math.round((score / mcqCount) * 100)}%)</p>
                  <Progress value={(score / mcqCount) * 100} className="mt-2 max-w-xs mx-auto" />
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={() => { setViewState("browse"); setQuestions([]); }}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Try Another Paper
                </Button>
              </div>
            </CardContent>
          </Card>

          {questions.map((q, i) => (
            <Card key={q.id} className={q.type === "mcq" ? (userAnswers[q.id] === q.correctAnswer ? "border-green-500/30" : "border-destructive/30") : ""}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={q.type === "mcq" ? "default" : "secondary"}>{q.type.toUpperCase()}</Badge>
                  <Badge variant="outline">{q.marks} marks</Badge>
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
                  <div key={oi} className={`p-2 rounded text-sm ${opt === q.correctAnswer ? "bg-green-500/10 font-medium" : userAnswers[q.id] === opt ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}>
                    {String.fromCharCode(65 + oi)}) {opt}
                  </div>
                ))}
                {q.explanation && <p className="text-sm text-muted-foreground mt-2"><strong>Solution:</strong> {q.explanation}</p>}
                {q.modelAnswer && <p className="text-sm text-muted-foreground mt-2"><strong>Model Answer:</strong> {q.modelAnswer}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  if (viewState === "test") {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 flex items-center justify-between border-b">
            <span className="font-medium">{examName} {selectedYear} · {selectedSection}</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className={`font-mono font-bold ${timeLeft < 60 ? "text-destructive" : "text-primary"}`}>{fmt(timeLeft)}</span>
            </div>
            <Button onClick={handleSubmit} size="sm">Submit</Button>
          </div>

          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={q.type === "mcq" ? "default" : "secondary"}>{q.type.toUpperCase()}</Badge>
                  <Badge variant="outline">{q.marks} marks</Badge>
                </div>
                <CardTitle className="text-base mt-2">Q{i + 1}. {q.question}</CardTitle>
              </CardHeader>
              <CardContent>
                {q.type === "mcq" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button key={oi} onClick={() => setUserAnswers(p => ({ ...p, [q.id]: opt }))}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${userAnswers[q.id] === opt ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent"}`}>
                        {String.fromCharCode(65 + oi)}) {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea className="w-full min-h-[100px] p-3 rounded-lg border bg-background text-sm resize-y"
                    placeholder="Write your answer..." value={userAnswers[q.id] || ""}
                    onChange={e => setUserAnswers(p => ({ ...p, [q.id]: e.target.value }))} />
                )}
              </CardContent>
            </Card>
          ))}
          <div className="text-center py-4"><Button onClick={handleSubmit} size="lg">Submit Paper</Button></div>
        </div>
      </AppLayout>
    );
  }

  // Browse state
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Previous Year Papers</h1>
          <p className="text-muted-foreground">Practice with AI-generated PYQ-style questions in timed test mode</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Paper</CardTitle>
            <CardDescription>Choose exam, year, and section to start a timed practice session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Exam</label>
              <Select value={examName} onValueChange={v => { setExamName(v); setSelectedYear(""); setSelectedSection(""); }}>
                <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {availableExams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {catalog && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {catalog.years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Section</label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {catalog.sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={generatePYQ} disabled={!examName || !selectedYear || !selectedSection}>
              <FileText className="w-4 h-4 mr-2" /> Start Timed Practice
            </Button>
          </CardContent>
        </Card>

        {/* Paper List */}
        {catalog && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{examName} Papers Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {catalog.years.map(year => (
                  <div key={year} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{examName} {year}</span>
                      <Badge variant="outline">{catalog.sections.length} sections</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {catalog.sections.map(section => (
                        <Button key={section} variant="outline" size="sm" className="text-xs"
                          onClick={() => { setSelectedYear(String(year)); setSelectedSection(section); generatePYQ(); }}>
                          <BookOpen className="w-3 h-3 mr-1" /> {section}
                        </Button>
                      ))}
                    </div>
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
