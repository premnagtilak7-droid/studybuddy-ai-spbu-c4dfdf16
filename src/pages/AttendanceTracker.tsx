import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Check, X, Clock, AlertTriangle } from "lucide-react";

type AttSubject = { id: string; subject_name: string; lectures_per_week: number };
type AttRecord = { id: string; subject_id: string; date: string; status: string };

export default function AttendanceTracker() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<AttSubject[]>([]);
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", lectures: 3 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: subs } = await supabase.from("attendance_subjects").select("*").eq("user_id", user!.id);
    setSubjects((subs || []) as AttSubject[]);
    if (subs?.length) {
      const subIds = subs.map((s: any) => s.id);
      const { data: recs } = await supabase.from("attendance_records").select("*").in("subject_id", subIds).order("date", { ascending: false });
      setRecords((recs || []) as AttRecord[]);
    }
  }

  async function addSubject() {
    if (!newSubject.name) return;
    await supabase.from("attendance_subjects").insert({ user_id: user!.id, subject_name: newSubject.name, lectures_per_week: newSubject.lectures });
    toast.success("Subject added!"); setAddOpen(false); setNewSubject({ name: "", lectures: 3 }); loadData();
  }

  async function markAttendance(subjectId: string, status: string) {
    const today = new Date().toISOString().split("T")[0];
    const existing = records.find(r => r.subject_id === subjectId && r.date === today);
    if (existing) {
      await supabase.from("attendance_records").update({ status }).eq("id", existing.id);
    } else {
      await supabase.from("attendance_records").insert({ subject_id: subjectId, date: today, status });
    }
    toast.success(`Marked ${status}`); loadData();
  }

  function getStats(subjectId: string) {
    const subRecords = records.filter(r => r.subject_id === subjectId);
    const total = subRecords.length;
    const present = subRecords.filter(r => r.status === "present" || r.status === "late").length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 100;
    // Calculate how many can be missed while staying above 75%
    const canMiss = total > 0 ? Math.max(0, Math.floor((present - 0.75 * total) / 0.75)) : 0;
    return { total, present, percent, canMiss };
  }

  function getColor(percent: number) {
    if (percent < 75) return "text-destructive";
    if (percent < 85) return "text-accent";
    return "text-success";
  }

  function getProgressColor(percent: number) {
    if (percent < 75) return "[&>div]:bg-destructive";
    if (percent < 85) return "[&>div]:bg-accent";
    return "[&>div]:bg-success";
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Attendance Tracker</h1><p className="text-muted-foreground text-sm">Track your lecture attendance</p></div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Subject</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Subject Name</Label><Input value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} placeholder="e.g. Data Structures" /></div>
                <div><Label>Lectures per Week</Label><Input type="number" value={newSubject.lectures} onChange={e => setNewSubject({ ...newSubject, lectures: parseInt(e.target.value) || 3 })} /></div>
                <Button onClick={addSubject} className="w-full">Add Subject</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {subjects.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No subjects added. Add your first subject!</p></Card>}

        <div className="space-y-4">
          {subjects.map(sub => {
            const stats = getStats(sub.id);
            const todayRecord = records.find(r => r.subject_id === sub.id && r.date === today);
            return (
              <Card key={sub.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{sub.subject_name}</p>
                      <p className="text-xs text-muted-foreground">{sub.lectures_per_week} lectures/week · {stats.total} classes total</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getColor(stats.percent)}`}>{stats.percent}%</p>
                      <p className="text-xs text-muted-foreground">{stats.present}/{stats.total} attended</p>
                    </div>
                  </div>
                  <Progress value={stats.percent} className={`h-2 mb-3 ${getProgressColor(stats.percent)}`} />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stats.percent < 75 && (
                        <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Below 75%!</Badge>
                      )}
                      {stats.canMiss > 0 && (
                        <Badge variant="secondary" className="text-[10px]">Can miss {stats.canMiss} more</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <p className="text-xs text-muted-foreground mr-2">Today:</p>
                      <Button size="sm" variant={todayRecord?.status === "present" ? "default" : "outline"} className="h-7 text-xs" onClick={() => markAttendance(sub.id, "present")}>
                        <Check className="w-3 h-3 mr-1" />Present
                      </Button>
                      <Button size="sm" variant={todayRecord?.status === "absent" ? "destructive" : "outline"} className="h-7 text-xs" onClick={() => markAttendance(sub.id, "absent")}>
                        <X className="w-3 h-3 mr-1" />Absent
                      </Button>
                      <Button size="sm" variant={todayRecord?.status === "late" ? "secondary" : "outline"} className="h-7 text-xs" onClick={() => markAttendance(sub.id, "late")}>
                        <Clock className="w-3 h-3 mr-1" />Late
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
