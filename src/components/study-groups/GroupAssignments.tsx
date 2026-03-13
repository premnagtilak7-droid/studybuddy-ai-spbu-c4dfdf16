import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { GroupAssignment, MemberWithStats } from "./types";

interface Props {
  groupId: string;
  isAdmin: boolean;
  members: MemberWithStats[];
}

export default function GroupAssignments({ groupId, isAdmin, members }: Props) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<(GroupAssignment & { completions: string[] })[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAssignments(); }, [groupId]);

  async function loadAssignments() {
    const { data } = await supabase.from("group_assignments").select("*").eq("group_id", groupId).order("created_at", { ascending: false });
    if (!data) { setAssignments([]); return; }
    const ids = data.map(a => (a as any).id);
    const { data: completions } = await supabase.from("group_assignment_completions").select("assignment_id, user_id").in("assignment_id", ids.length ? ids : ["none"]);
    setAssignments((data as any[]).map(a => ({
      ...a,
      completions: (completions || []).filter(c => c.assignment_id === a.id).map(c => c.user_id),
    })));
  }

  async function createAssignment() {
    if (!title.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("group_assignments").insert({
      group_id: groupId, created_by: user!.id, title, description: desc,
      deadline: deadline || null, assigned_to: selectedMembers.length ? selectedMembers : members.map(m => m.user_id),
    } as any);
    if (error) toast.error("Failed to create"); else { toast.success("Assignment created"); setCreateOpen(false); setTitle(""); setDesc(""); setDeadline(""); setSelectedMembers([]); loadAssignments(); }
    setLoading(false);
  }

  async function toggleCompletion(assignmentId: string, completed: boolean) {
    if (completed) {
      await supabase.from("group_assignment_completions").delete().eq("assignment_id", assignmentId).eq("user_id", user!.id);
    } else {
      await supabase.from("group_assignment_completions").insert({ assignment_id: assignmentId, user_id: user!.id } as any);
    }
    loadAssignments();
  }

  async function deleteAssignment(id: string) {
    await supabase.from("group_assignments").delete().eq("id", id);
    loadAssignments();
  }

  const getName = (uid: string) => members.find(m => m.user_id === uid)?.display_name || members.find(m => m.user_id === uid)?.email || "User";
  const isOverdue = (d: string | null) => d && new Date(d) < new Date();

  return (
    <div className="space-y-3">
      {isAdmin && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-3.5 h-3.5" />New Assignment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete Unit 3 problems" /></div>
              <div><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
              <div><Label>Deadline</Label><Input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
              <div>
                <Label>Assign to (leave empty for all)</Label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {members.map(m => (
                    <label key={m.user_id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={selectedMembers.includes(m.user_id)} onCheckedChange={c => setSelectedMembers(c ? [...selectedMembers, m.user_id] : selectedMembers.filter(id => id !== m.user_id))} />
                      {m.display_name || m.email}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={createAssignment} disabled={loading} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <ScrollArea className="h-72">
        {assignments.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No assignments yet</p>}
        <div className="space-y-2">
          {assignments.map(a => {
            const myCompleted = a.completions.includes(user!.id);
            const total = a.assigned_to.length || members.length;
            const done = a.completions.length;
            return (
              <div key={a.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.deadline && (
                      <Badge variant={isOverdue(a.deadline) ? "destructive" : "outline"} className="text-[10px] gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{new Date(a.deadline).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />{done}/{total}</Badge>
                  </div>
                  <div className="flex gap-1">
                    {a.assigned_to.includes(user!.id) || a.assigned_to.length === 0 ? (
                      <Button size="sm" variant={myCompleted ? "secondary" : "default"} className="text-xs h-7" onClick={() => toggleCompletion(a.id, myCompleted)}>
                        {myCompleted ? "Undo" : "Mark Done"}
                      </Button>
                    ) : null}
                    {isAdmin && <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => deleteAssignment(a.id)}>Delete</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
