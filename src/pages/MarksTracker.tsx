import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, TrendingUp, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type MarksEntry = {
  id: string; subject_name: string; ia1_marks: number | null; ia1_total: number; ia2_marks: number | null; ia2_total: number;
  assignment_marks: number | null; assignment_total: number; attendance_marks: number | null; attendance_total: number;
  target_grade: string | null; credits: number; semester: number;
};
type CGPAEntry = { semester: number; sgpa: number };

const GRADE_TABLE = [
  { grade: "O", points: 10, min: 80 }, { grade: "A+", points: 9, min: 70 }, { grade: "A", points: 8, min: 60 },
  { grade: "B+", points: 7, min: 55 }, { grade: "B", points: 6, min: 50 }, { grade: "C", points: 5, min: 45 },
  { grade: "D", points: 4, min: 40 }, { grade: "F", points: 0, min: 0 },
];

export default function MarksTracker() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MarksEntry[]>([]);
  const [cgpaHistory, setCgpaHistory] = useState<CGPAEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [cgpaOpen, setCgpaOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ subject_name: "", credits: 3, semester: 1 });
  const [newCgpa, setNewCgpa] = useState({ semester: 1, sgpa: 0 });
  const [targetCGPA, setTargetCGPA] = useState(8.0);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: marks } = await supabase.from("marks_tracker").select("*").eq("user_id", user!.id).order("semester");
    setEntries((marks || []) as MarksEntry[]);
    const { data: cgpa } = await supabase.from("cgpa_history").select("semester, sgpa").eq("user_id", user!.id).order("semester");
    setCgpaHistory((cgpa || []) as CGPAEntry[]);
  }

  async function addEntry() {
    if (!newEntry.subject_name) return;
    await supabase.from("marks_tracker").insert({ user_id: user!.id, subject_name: newEntry.subject_name, credits: newEntry.credits, semester: newEntry.semester });
    toast.success("Subject added!"); setAddOpen(false); setNewEntry({ subject_name: "", credits: 3, semester: 1 }); loadData();
  }

  async function updateMarks(id: string, field: string, value: number | null) {
    await supabase.from("marks_tracker").update({ [field]: value }).eq("id", id);
    loadData();
  }

  async function saveCGPA() {
    const { error } = await supabase.from("cgpa_history").upsert({ user_id: user!.id, semester: newCgpa.semester, sgpa: newCgpa.sgpa }, { onConflict: "user_id,semester" });
    if (!error) { toast.success("SGPA saved!"); setCgpaOpen(false); loadData(); }
  }

  function getInternalMarks(e: MarksEntry) {
    const ia1 = e.ia1_marks != null ? (e.ia1_marks / e.ia1_total) * 15 : 0;
    const ia2 = e.ia2_marks != null ? (e.ia2_marks / e.ia2_total) * 15 : 0;
    return Math.round((ia1 + ia2) * 10) / 10;
  }

  function getMinEndSem(e: MarksEntry) {
    const internal = getInternalMarks(e);
    const gradeEntry = GRADE_TABLE.find(g => g.points >= targetCGPA) || GRADE_TABLE[0];
    const needed = gradeEntry.min - internal;
    return Math.max(0, Math.round(needed));
  }

  const overallCGPA = cgpaHistory.length > 0 ? (cgpaHistory.reduce((a, c) => a + c.sgpa, 0) / cgpaHistory.length).toFixed(2) : "N/A";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="text-2xl font-bold text-foreground">Marks & CGPA Tracker</h1><p className="text-muted-foreground text-sm">Track your academic performance</p></div>
          <div className="flex gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Subject</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Subject Name</Label><Input value={newEntry.subject_name} onChange={e => setNewEntry({ ...newEntry, subject_name: e.target.value })} /></div>
                  <div><Label>Credits</Label><Input type="number" value={newEntry.credits} onChange={e => setNewEntry({ ...newEntry, credits: parseInt(e.target.value) || 3 })} /></div>
                  <div><Label>Semester</Label><Input type="number" value={newEntry.semester} onChange={e => setNewEntry({ ...newEntry, semester: parseInt(e.target.value) || 1 })} /></div>
                  <Button onClick={addEntry} className="w-full">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={cgpaOpen} onOpenChange={setCgpaOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><TrendingUp className="w-4 h-4 mr-1" />Add SGPA</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Semester SGPA</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Semester</Label><Input type="number" value={newCgpa.semester} onChange={e => setNewCgpa({ ...newCgpa, semester: parseInt(e.target.value) || 1 })} /></div>
                  <div><Label>SGPA</Label><Input type="number" step="0.01" value={newCgpa.sgpa} onChange={e => setNewCgpa({ ...newCgpa, sgpa: parseFloat(e.target.value) || 0 })} /></div>
                  <Button onClick={saveCGPA} className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* CGPA Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Award className="w-6 h-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{overallCGPA}</p>
            <p className="text-xs text-muted-foreground">Current CGPA</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-success mb-1" />
            <p className="text-2xl font-bold text-foreground">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Subjects Tracked</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <Label className="text-xs">Target CGPA</Label>
            <Input type="number" step="0.1" value={targetCGPA} onChange={e => setTargetCGPA(parseFloat(e.target.value) || 8)} className="mt-1" />
          </CardContent></Card>
        </div>

        {/* CGPA History Chart */}
        {cgpaHistory.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">CGPA History</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cgpaHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semester" label={{ value: "Semester", position: "insideBottom", offset: -5 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sgpa" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Marks Table */}
        {entries.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No subjects added yet.</p></Card>}
        <div className="space-y-3">
          {entries.map(e => (
            <Card key={e.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{e.subject_name}</p>
                    <p className="text-xs text-muted-foreground">Sem {e.semester} · {e.credits} credits</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">Internal: {getInternalMarks(e)}/30</p>
                    <p className="text-xs text-muted-foreground">Min end-sem needed: {getMinEndSem(e)}/70</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px]">IA1 (/{e.ia1_total})</Label>
                    <Input type="number" value={e.ia1_marks ?? ""} onChange={ev => updateMarks(e.id, "ia1_marks", ev.target.value ? parseFloat(ev.target.value) : null)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px]">IA2 (/{e.ia2_total})</Label>
                    <Input type="number" value={e.ia2_marks ?? ""} onChange={ev => updateMarks(e.id, "ia2_marks", ev.target.value ? parseFloat(ev.target.value) : null)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Assignment (/{e.assignment_total})</Label>
                    <Input type="number" value={e.assignment_marks ?? ""} onChange={ev => updateMarks(e.id, "assignment_marks", ev.target.value ? parseFloat(ev.target.value) : null)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Attendance (/{e.attendance_total})</Label>
                    <Input type="number" value={e.attendance_marks ?? ""} onChange={ev => updateMarks(e.id, "attendance_marks", ev.target.value ? parseFloat(ev.target.value) : null)} className="h-8 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SPPU Grade Table */}
        <Card>
          <CardHeader><CardTitle className="text-base">SPPU 2024 Grade Table</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <p className="font-semibold text-muted-foreground">Grade</p><p className="font-semibold text-muted-foreground">Points</p><p className="font-semibold text-muted-foreground">Min %</p><p className="font-semibold text-muted-foreground">Range</p>
              {GRADE_TABLE.map(g => (
                <><p key={g.grade} className="text-foreground font-medium">{g.grade}</p><p className="text-foreground">{g.points}</p><p className="text-foreground">{g.min}%</p><p className="text-muted-foreground">{g.min}-{GRADE_TABLE[GRADE_TABLE.indexOf(g) - 1]?.min ? GRADE_TABLE[GRADE_TABLE.indexOf(g) - 1].min - 1 : 100}%</p></>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
