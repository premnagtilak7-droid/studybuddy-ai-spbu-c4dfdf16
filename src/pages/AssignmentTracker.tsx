import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, FileText, FlaskConical, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";

type Assignment = { id: string; subject: string; title: string; deadline: string | null; status: string };
type Lab = { id: string; subject: string; experiment_name: string; is_completed: boolean; completed_at: string | null };

export default function AssignmentTracker() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [addAssOpen, setAddAssOpen] = useState(false);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [newAss, setNewAss] = useState({ subject: "", title: "", deadline: "" });
  const [newLab, setNewLab] = useState({ subject: "", experiment_name: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: ass } = await supabase.from("assignments").select("*").eq("user_id", user!.id).order("deadline");
    setAssignments((ass || []) as Assignment[]);
    const { data: lb } = await supabase.from("lab_experiments").select("*").eq("user_id", user!.id).order("created_at");
    setLabs((lb || []) as Lab[]);
  }

  async function addAssignment() {
    if (!newAss.subject || !newAss.title) return;
    await supabase.from("assignments").insert({ user_id: user!.id, subject: newAss.subject, title: newAss.title, deadline: newAss.deadline || null });
    toast.success("Assignment added!"); setAddAssOpen(false); setNewAss({ subject: "", title: "", deadline: "" }); loadData();
  }

  async function addLab() {
    if (!newLab.subject || !newLab.experiment_name) return;
    await supabase.from("lab_experiments").insert({ user_id: user!.id, subject: newLab.subject, experiment_name: newLab.experiment_name });
    toast.success("Lab added!"); setAddLabOpen(false); setNewLab({ subject: "", experiment_name: "" }); loadData();
  }

  async function updateAssStatus(id: string, status: string) {
    await supabase.from("assignments").update({ status }).eq("id", id);
    loadData();
  }

  async function toggleLab(id: string, completed: boolean) {
    await supabase.from("lab_experiments").update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", id);
    loadData();
  }

  function getUrgency(deadline: string | null) {
    if (!deadline) return { label: "No deadline", color: "secondary" as const };
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return { label: "Overdue", color: "destructive" as const };
    if (days === 0) return { label: "Due today!", color: "destructive" as const };
    if (days <= 2) return { label: `Due in ${days}d`, color: "destructive" as const };
    if (days <= 7) return { label: `Due in ${days}d`, color: "secondary" as const };
    return { label: format(new Date(deadline), "MMM d"), color: "outline" as const };
  }

  // Upcoming in next 7 days
  const upcoming = assignments.filter(a => {
    if (!a.deadline || a.status === "submitted") return false;
    const days = differenceInDays(new Date(a.deadline), new Date());
    return days >= 0 && days <= 7;
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div><h1 className="text-2xl font-bold text-foreground">Assignment & Lab Tracker</h1><p className="text-muted-foreground text-sm">Track deadlines and lab experiments</p></div>

        {/* Upcoming Deadlines Widget */}
        {upcoming.length > 0 && (
          <Card className="border-accent">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-accent" />Upcoming Deadlines (7 days)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcoming.map(a => {
                const u = getUrgency(a.deadline);
                return (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.subject}</p>
                    </div>
                    <Badge variant={u.color}>{u.label}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="assignments">
          <TabsList className="w-full"><TabsTrigger value="assignments" className="flex-1"><FileText className="w-4 h-4 mr-1" />Assignments</TabsTrigger><TabsTrigger value="labs" className="flex-1"><FlaskConical className="w-4 h-4 mr-1" />Lab Experiments</TabsTrigger></TabsList>

          <TabsContent value="assignments" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addAssOpen} onOpenChange={setAddAssOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Assignment</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Assignment</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Subject</Label><Input value={newAss.subject} onChange={e => setNewAss({ ...newAss, subject: e.target.value })} /></div>
                    <div><Label>Title</Label><Input value={newAss.title} onChange={e => setNewAss({ ...newAss, title: e.target.value })} /></div>
                    <div><Label>Deadline</Label><Input type="date" value={newAss.deadline} onChange={e => setNewAss({ ...newAss, deadline: e.target.value })} /></div>
                    <Button onClick={addAssignment} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {assignments.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No assignments yet.</p></Card>}
            {assignments.map(a => {
              const u = getUrgency(a.deadline);
              return (
                <Card key={a.id}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.subject} · <Badge variant={u.color} className="text-[10px]">{u.label}</Badge></p>
                    </div>
                    <Select value={a.status} onValueChange={v => updateAssStatus(a.id, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="labs" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addLabOpen} onOpenChange={setAddLabOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Experiment</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Lab Experiment</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Subject</Label><Input value={newLab.subject} onChange={e => setNewLab({ ...newLab, subject: e.target.value })} /></div>
                    <div><Label>Experiment Name</Label><Input value={newLab.experiment_name} onChange={e => setNewLab({ ...newLab, experiment_name: e.target.value })} /></div>
                    <Button onClick={addLab} className="w-full">Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {labs.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No lab experiments yet.</p></Card>}
            {labs.map(l => (
              <Card key={l.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={l.is_completed} onCheckedChange={v => toggleLab(l.id, !!v)} />
                    <div>
                      <p className={`text-sm font-medium ${l.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{l.experiment_name}</p>
                      <p className="text-xs text-muted-foreground">{l.subject}</p>
                    </div>
                  </div>
                  {l.is_completed && <Badge className="bg-success text-success-foreground text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
