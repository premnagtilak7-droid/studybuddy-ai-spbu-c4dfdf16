import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getReminders, addReminder, updateReminder, deleteReminder, type StudyReminder } from "@/lib/study-reminders";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Clock, Edit2 } from "lucide-react";

export default function StudyRemindersCard() {
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ subjectId: "none", subjectName: "", time: "09:00" });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [subs, rems] = await Promise.all([getSubjects(), getReminders()]);
    setSubjects(subs);
    setReminders(rems);
  }

  async function handleAdd() {
    if (!form.time) return;
    const name = form.subjectId !== "none"
      ? subjects.find(s => s.id === form.subjectId)?.name || "Study"
      : form.subjectName || "Study";
    try {
      await addReminder(form.subjectId !== "none" ? form.subjectId : null, name, form.time);
      toast.success(`Reminder set for ${form.time}`);
      setAddOpen(false);
      setForm({ subjectId: "none", subjectName: "", time: "09:00" });
      loadData();
    } catch {
      toast.error("Failed to add reminder");
    }
  }

  async function handleUpdate() {
    if (!editingId || !form.time) return;
    const name = form.subjectId !== "none"
      ? subjects.find(s => s.id === form.subjectId)?.name || "Study"
      : form.subjectName || "Study";
    await updateReminder(editingId, { reminder_time: form.time, subject_name: name });
    toast.success("Reminder updated");
    setEditingId(null);
    loadData();
  }

  async function handleDelete(id: string) {
    await deleteReminder(id);
    toast.success("Reminder deleted");
    loadData();
  }

  async function handleToggle(id: string, active: boolean) {
    await updateReminder(id, { is_active: active });
    loadData();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-primary" /> Study Reminders
          </CardTitle>
          <Dialog open={addOpen || !!editingId} onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setForm({ subjectId: "none", subjectName: "", time: "09:00" }); setAddOpen(true); }}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>{editingId ? "Edit Reminder" : "Add Study Reminder"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Custom name</SelectItem>
                      {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.subjectId === "none" && (
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={form.subjectName} onChange={e => setForm({ ...form, subjectName: e.target.value })} placeholder="e.g. Revision" />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Time</Label>
                  <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                </div>
                <Button className="w-full" onClick={editingId ? handleUpdate : handleAdd}>
                  {editingId ? "Update" : "Set Reminder"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {reminders.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No reminders set yet</p>
        )}
        {reminders.map(r => (
          <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.subject_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{r.reminder_time}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Switch checked={r.is_active} onCheckedChange={v => handleToggle(r.id, v)} className="scale-75" />
              <button onClick={() => { setForm({ subjectId: r.subject_id || "none", subjectName: r.subject_name, time: r.reminder_time }); setEditingId(r.id); }}
                className="p-1 text-muted-foreground hover:text-foreground">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={() => handleDelete(r.id)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
