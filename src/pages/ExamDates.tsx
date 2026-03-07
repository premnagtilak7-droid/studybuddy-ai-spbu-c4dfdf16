import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar as CalendarIcon, Trash2, Clock } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getExamDates, addExamDate, deleteExamDate, getNextExam, type ExamDate } from "@/lib/exam-store";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ExamDates() {
  const { isAdmin } = useAuth();
  const [exams, setExams] = useState<ExamDate[]>([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: "", label: "", isGlobal: false });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [e, s] = await Promise.all([getExamDates(), getSubjects()]);
      setExams(e);
      setSubjects(s);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.date || !form.label.trim()) return;
    try {
      await addExamDate(form.date, form.label, undefined, isAdmin && form.isGlobal);
      setForm({ date: "", label: "", isGlobal: false });
      setShowAdd(false);
      toast.success("Exam date added!");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExamDate(id);
      toast.success("Deleted");
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const nextExam = getNextExam(exams);

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exam Dates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {nextExam ? `Next: ${nextExam.exam.label} in ${nextExam.daysLeft} days` : "No upcoming exams"}
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Date</Button>
        </div>

        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Label</Label>
                <Input placeholder="e.g. BEE End Sem" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={form.isGlobal} onChange={e => setForm(f => ({ ...f, isGlobal: e.target.checked }))} />
                Set as global (visible to all students)
              </label>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          {exams.map((exam) => {
            const d = new Date(exam.exam_date);
            const now = new Date(); now.setHours(0,0,0,0);
            const diff = Math.ceil((d.getTime() - now.getTime()) / (1000*60*60*24));
            const isPast = diff < 0;
            const isUrgent = diff >= 0 && diff <= 7;

            return (
              <motion.div key={exam.id} layout className={`glass-card p-4 flex items-center justify-between ${isUrgent ? "ring-2 ring-destructive/30" : ""} ${isPast ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUrgent ? "bg-destructive" : "gradient-accent"}`}>
                    <CalendarIcon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{exam.label}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {exam.exam_date} {exam.is_global && "· 🌍 Global"} {isPast ? "· Past" : `· ${diff}d left`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </motion.div>
            );
          })}
          {exams.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No exam dates set. Add your first exam date!</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
