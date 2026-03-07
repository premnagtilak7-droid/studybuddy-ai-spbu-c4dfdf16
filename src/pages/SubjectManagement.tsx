import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, BookOpen, Save, X } from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  type UserSubject,
} from "@/lib/subjects-store";

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", targetUnits: 6 });

  useEffect(() => { setSubjects(getSubjects()); }, []);

  const handleAdd = () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const updated = addSubject(form.name, form.code.toUpperCase(), form.targetUnits);
    setSubjects(updated);
    setForm({ name: "", code: "", targetUnits: 6 });
    setShowAdd(false);
  };

  const handleUpdate = (id: string) => {
    const updated = updateSubject(id, {
      name: form.name,
      code: form.code.toUpperCase(),
      targetUnits: form.targetUnits,
    });
    setSubjects(updated);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    setSubjects(deleteSubject(id));
  };

  const startEdit = (s: UserSubject) => {
    setEditing(s.id);
    setForm({ name: s.name, code: s.code, targetUnits: s.targetUnits });
  };

  const totalTarget = subjects.reduce((a, s) => a + s.targetUnits, 0);
  const totalCompleted = subjects.reduce((a, s) => a + s.completedUnits, 0);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subject Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {subjects.length} subjects · {totalCompleted}/{totalTarget} units completed
            </p>
          </div>
          <Button onClick={() => { setShowAdd(true); setForm({ name: "", code: "", targetUnits: 6 }); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Subject
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <h3 className="font-semibold text-foreground mb-4">New Subject</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Subject Name</Label>
                <Input placeholder="e.g. Basic Electronics" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Code</Label>
                <Input placeholder="e.g. BEE" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} maxLength={5} />
              </div>
              <div>
                <Label>Target Units</Label>
                <Input type="number" min={1} max={20} value={form.targetUnits} onChange={(e) => setForm(f => ({ ...f, targetUnits: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} size="sm"><Save className="w-4 h-4 mr-1" /> Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            </div>
          </motion.div>
        )}

        {/* Subject list */}
        <div className="space-y-3">
          {subjects.map((subj) => (
            <motion.div
              key={subj.id}
              layout
              className="glass-card p-5"
            >
              {editing === subj.id ? (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Subject Name</Label>
                      <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Code</Label>
                      <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} maxLength={5} />
                    </div>
                    <div>
                      <Label>Target Units</Label>
                      <Input type="number" min={1} max={20} value={form.targetUnits} onChange={(e) => setForm(f => ({ ...f, targetUnits: parseInt(e.target.value) || 1 }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" onClick={() => handleUpdate(subj.id)}><Save className="w-4 h-4 mr-1" /> Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm font-mono text-primary-foreground"
                      style={{ background: `hsl(var(--${subj.color}))` }}
                    >
                      {subj.code}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{subj.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">
                        {subj.completedUnits}/{subj.targetUnits} units completed
                      </p>
                      <div className="w-32 h-1.5 bg-secondary rounded-full mt-2">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (subj.completedUnits / subj.targetUnits) * 100)}%`,
                            background: `hsl(var(--${subj.color}))`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(subj)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(subj.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {subjects.length === 0 && (
            <div className="glass-card p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No subjects yet. Add your first subject to get started.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
