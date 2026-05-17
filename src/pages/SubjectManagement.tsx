import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Save, X, GraduationCap, ChevronDown, ChevronRight,
  ChevronUp, ListPlus, Check, Sparkles,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  getSubjects, addSubject, updateSubject, deleteSubject, type UserSubject,
} from "@/lib/subjects-store";
import {
  getUnitsWithTopics, addUnit, updateUnitName, deleteUnit, reorderUnits,
  seedUnitsForSubject, addTopic, toggleTopic, deleteTopic, type Unit,
} from "@/lib/units-store";
import { awardXP } from "@/lib/xp-store";
import { recordStudySession } from "@/lib/study-tracker";
import { celebrateComplete } from "@/lib/confetti";
import { playCompleteSound } from "@/lib/sounds";
import { findPresetUnits, describePreset, type SyllabusContext } from "@/lib/syllabusData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SyllabusTemplateSelector from "@/components/SyllabusTemplateSelector";

type UnitMap = Record<string, Unit[]>;

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [unitMap, setUnitMap] = useState<UnitMap>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", targetUnits: 6 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editingUnitName, setEditingUnitName] = useState("");
  const [newTopicInput, setNewTopicInput] = useState<Record<string, string>>({});
  const [addUnitFor, setAddUnitFor] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState({ number: 1, name: "", topics: "" });

  const [educationType, setEducationType] = useState<string | null>(null);
  const [examName, setExamName] = useState<string | null>(null);
  const [classLevel, setClassLevel] = useState<string | null>(null);
  const [board, setBoard] = useState<string | null>(null);

  const ctx: SyllabusContext = { educationType, classLevel, board };

  const loadSubjects = useCallback(async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
      // Lazy-load units only for expanded subjects (and any new ones)
      const next: UnitMap = { ...unitMap };
      await Promise.all(
        data
          .filter((s) => expanded.has(s.id) || !next[s.id])
          .map(async (s) => {
            try { next[s.id] = await getUnitsWithTopics(s.id); } catch {}
          })
      );
      setUnitMap(next);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("education_type, education_details")
      .eq("user_id", user.id)
      .single();
    if (data) {
      setEducationType(data.education_type);
      const details = (data.education_details || {}) as any;
      setExamName(details?.exam_name || null);
      setClassLevel(details?.class || details?.class_level || details?.grade || null);
      setBoard(details?.board || null);
    }
  };

  useEffect(() => { loadSubjects(); loadProfile(); }, []);

  // Reload units for a subject when expanded
  const ensureUnitsLoaded = useCallback(async (subjectId: string) => {
    if (unitMap[subjectId]) return;
    try {
      const units = await getUnitsWithTopics(subjectId);
      setUnitMap((m) => ({ ...m, [subjectId]: units }));
    } catch (err: any) { toast.error(err.message); }
  }, [unitMap]);

  const refreshUnits = async (subjectId: string) => {
    try {
      const units = await getUnitsWithTopics(subjectId);
      setUnitMap((m) => ({ ...m, [subjectId]: units }));
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleExpand = async (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else { next.add(id); await ensureUnitsLoaded(id); }
    setExpanded(next);
  };

  // ───── Subject CRUD ─────

  const handleAdd = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    try {
      const preset = findPresetUnits(form.name, ctx);
      const targetUnits = preset ? preset.length : form.targetUnits;
      const created = await addSubject(form.name, form.code.toUpperCase(), targetUnits);
      if (preset) {
        await seedUnitsForSubject(created.id, preset);
        await updateSubject(created.id, { target_units: preset.length });
        toast.success(`${form.name} added with full syllabus (${describePreset(preset)})`);
      } else {
        toast.success("Subject added!");
      }
      setForm({ name: "", code: "", targetUnits: 6 });
      setShowAdd(false);
      // expand the newly created subject so user sees the units
      setExpanded((s) => new Set([...s, created.id]));
      await refreshUnits(created.id);
      await loadSubjects();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateSubject(id, {
        name: form.name,
        code: form.code.toUpperCase(),
        target_units: form.targetUnits,
      });
      setEditing(null);
      toast.success("Subject updated!");
      loadSubjects();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject and all its units/topics?")) return;
    try {
      await deleteSubject(id);
      setUnitMap((m) => { const n = { ...m }; delete n[id]; return n; });
      toast.success("Subject deleted");
      loadSubjects();
    } catch (err: any) { toast.error(err.message); }
  };

  const startEdit = (s: UserSubject) => {
    setEditing(s.id);
    setForm({ name: s.name, code: s.code, targetUnits: s.target_units });
  };

  // ───── Unit CRUD ─────

  const openAddUnit = (subjectId: string) => {
    const existing = unitMap[subjectId] || [];
    setUnitForm({ number: existing.length + 1, name: "", topics: "" });
    setAddUnitFor(subjectId);
  };

  const handleSaveUnit = async () => {
    if (!addUnitFor || !unitForm.name.trim()) return;
    try {
      const topicList = unitForm.topics.split(",").map((t) => t.trim()).filter(Boolean);
      await addUnit(addUnitFor, unitForm.name.trim(), topicList);
      toast.success("Unit added");
      await refreshUnits(addUnitFor);
      setAddUnitFor(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveUnitName = async (subjectId: string, unitId: string) => {
    if (!editingUnitName.trim()) return;
    try {
      await updateUnitName(unitId, editingUnitName.trim());
      setEditingUnit(null);
      await refreshUnits(subjectId);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteUnit = async (subjectId: string, unitId: string) => {
    if (!confirm("Delete this unit and all its topics?")) return;
    try {
      await deleteUnit(unitId);
      await refreshUnits(subjectId);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleMove = async (subjectId: string, index: number, dir: -1 | 1) => {
    const list = unitMap[subjectId] || [];
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setUnitMap((m) => ({ ...m, [subjectId]: reordered.map((u, i) => ({ ...u, unit_number: i + 1 })) }));
    try {
      await reorderUnits(subjectId, reordered.map((u) => u.id));
      await refreshUnits(subjectId);
    } catch (err: any) { toast.error(err.message); await refreshUnits(subjectId); }
  };

  // ───── Topic CRUD ─────

  const handleAddTopic = async (subjectId: string, unitId: string) => {
    const name = (newTopicInput[unitId] || "").trim();
    if (!name) return;
    try {
      await addTopic(unitId, name);
      setNewTopicInput((s) => ({ ...s, [unitId]: "" }));
      await refreshUnits(subjectId);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleTopic = async (subjectId: string, topicId: string, current: boolean) => {
    try {
      await toggleTopic(topicId, !current);
      if (!current) {
        recordStudySession();
        playCompleteSound();
        celebrateComplete();
        const amount = await awardXP("topic_complete");
        if (amount > 0) toast.success(`+${amount} XP for completing topic!`);
      }
      await refreshUnits(subjectId);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteTopic = async (subjectId: string, topicId: string) => {
    try {
      await deleteTopic(topicId);
      await refreshUnits(subjectId);
    } catch (err: any) { toast.error(err.message); }
  };

  // ───── Aggregate stats ─────

  const subjectProgress = (s: UserSubject) => {
    const units = unitMap[s.id];
    if (!units) {
      const target = s.target_units || 1;
      return { completed: s.completed_units, total: target, pct: Math.min(100, (s.completed_units / target) * 100), topicsDone: 0, topicsTotal: 0 };
    }
    const allTopics = units.flatMap((u) => u.topics || []);
    const done = allTopics.filter((t) => t.is_completed).length;
    const total = allTopics.length;
    const unitsDone = units.filter((u) => (u.topics || []).length > 0 && (u.topics || []).every((t) => t.is_completed)).length;
    return {
      completed: unitsDone,
      total: units.length || s.target_units,
      pct: total > 0 ? (done / total) * 100 : 0,
      topicsDone: done,
      topicsTotal: total,
    };
  };

  const totalTarget = subjects.reduce((a, s) => a + s.target_units, 0);
  const totalCompleted = subjects.reduce((a, s) => a + s.completed_units, 0);
  const existingCodes = subjects.map((s) => s.code);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading subjects...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
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

        <SyllabusTemplateSelector
          educationType={educationType}
          examName={examName}
          existingSubjectCodes={existingCodes}
          onSubjectsAdded={loadSubjects}
        />

        {/* Add custom subject form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-5"
            >
              <h3 className="font-semibold text-foreground mb-1">New Subject</h3>
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                If we recognise the subject for your class/board, full syllabus is auto-loaded.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Subject Name</Label>
                  <Input placeholder="e.g. Mathematics" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input placeholder="e.g. MATH" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} maxLength={5} />
                </div>
                <div>
                  <Label>Target Units (if custom)</Label>
                  <Input type="number" min={1} max={30} value={form.targetUnits} onChange={(e) => setForm((f) => ({ ...f, targetUnits: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAdd} size="sm"><Save className="w-4 h-4 mr-1" /> Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subject list */}
        <div className="space-y-3">
          {subjects.map((subj) => {
            const isOpen = expanded.has(subj.id);
            const units = unitMap[subj.id] || [];
            const prog = subjectProgress(subj);
            return (
              <motion.div key={subj.id} layout className="glass-card overflow-hidden">
                {editing === subj.id ? (
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
                      <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} maxLength={5} /></div>
                      <div><Label>Target Units</Label><Input type="number" min={1} max={30} value={form.targetUnits} onChange={(e) => setForm((f) => ({ ...f, targetUnits: parseInt(e.target.value) || 1 }))} /></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={() => handleUpdate(subj.id)}><Save className="w-4 h-4 mr-1" /> Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(null)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-5 flex items-center justify-between gap-3 flex-wrap">
                      <button onClick={() => toggleExpand(subj.id)} className="flex items-center gap-4 text-left flex-1 min-w-0">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm font-mono text-primary-foreground flex-shrink-0"
                          style={{ background: `hsl(var(--${subj.color}))` }}
                        >
                          {subj.code}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate">{subj.name}</h3>
                          <p className="text-xs font-mono text-muted-foreground">
                            {prog.completed}/{prog.total} units · {prog.topicsDone}/{prog.topicsTotal} topics
                          </p>
                          <div className="w-full max-w-xs h-1.5 bg-secondary rounded-full mt-2">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, prog.pct)}%`, background: `hsl(var(--${subj.color}))` }}
                            />
                          </div>
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openAddUnit(subj.id)} className="gap-1">
                          <ListPlus className="w-4 h-4" /> Add Unit
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(subj)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(subj.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>

                    {/* Units & topics */}
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border">
                        <div className="p-4 space-y-2">
                          {units.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No units yet — click "Add Unit" to create one.</p>
                          )}
                          {units.map((unit, idx) => {
                            const topics = unit.topics || [];
                            const done = topics.filter((t) => t.is_completed).length;
                            const isEditingThis = editingUnit === unit.id;
                            return (
                              <div key={unit.id} className="rounded-lg border border-border/50">
                                <div className="flex items-center gap-2 p-2.5">
                                  <div className="flex flex-col">
                                    <button disabled={idx === 0} onClick={() => handleMove(subj.id, idx, -1)} className="disabled:opacity-20 hover:text-primary"><ChevronUp className="w-3 h-3" /></button>
                                    <button disabled={idx === units.length - 1} onClick={() => handleMove(subj.id, idx, 1)} className="disabled:opacity-20 hover:text-primary"><ChevronDown className="w-3 h-3" /></button>
                                  </div>
                                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-xs font-bold font-mono text-secondary-foreground flex-shrink-0">
                                    U{unit.unit_number}
                                  </div>
                                  {isEditingThis ? (
                                    <div className="flex-1 flex items-center gap-1.5">
                                      <Input value={editingUnitName} onChange={(e) => setEditingUnitName(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveUnitName(subj.id, unit.id)} className="h-8" />
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveUnitName(subj.id, unit.id)}><Check className="w-3.5 h-3.5" /></Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingUnit(null)}><X className="w-3.5 h-3.5" /></Button>
                                    </div>
                                  ) : (
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm text-foreground truncate">{unit.name}</h4>
                                      <p className="text-[10px] font-mono text-muted-foreground">{done}/{topics.length} topics</p>
                                    </div>
                                  )}
                                  {!isEditingThis && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingUnit(unit.id); setEditingUnitName(unit.name); }}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDeleteUnit(subj.id, unit.id)}>
                                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {/* Topics */}
                                <div className="pl-12 pr-3 pb-3 space-y-1">
                                  {topics.map((topic) => (
                                    <div key={topic.id} className="flex items-center gap-2 group rounded hover:bg-secondary/40 p-1.5">
                                      <Checkbox checked={topic.is_completed} onCheckedChange={() => handleToggleTopic(subj.id, topic.id, topic.is_completed)} />
                                      <span className={`flex-1 text-sm ${topic.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {topic.name}
                                      </span>
                                      <button onClick={() => handleDeleteTopic(subj.id, topic.id)} className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-2 pt-1">
                                    <Input
                                      placeholder="+ Add topic, press Enter"
                                      value={newTopicInput[unit.id] || ""}
                                      onChange={(e) => setNewTopicInput((s) => ({ ...s, [unit.id]: e.target.value }))}
                                      onKeyDown={(e) => e.key === "Enter" && handleAddTopic(subj.id, unit.id)}
                                      className="h-8 text-sm"
                                    />
                                    <Button size="sm" variant="ghost" onClick={() => handleAddTopic(subj.id, unit.id)} className="h-8 px-2"><Plus className="w-3.5 h-3.5" /></Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}

          {subjects.length === 0 && !showAdd && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-4">
                <GraduationCap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Create Your First Subject</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Use a syllabus template above or add a custom subject to start tracking your progress.
              </p>
              <Button onClick={() => { setShowAdd(true); setForm({ name: "", code: "", targetUnits: 6 }); }}>
                <Plus className="w-4 h-4 mr-1" /> Create Custom Subject
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Unit modal */}
      <Dialog open={!!addUnitFor} onOpenChange={(o) => !o && setAddUnitFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Chapter / Unit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Unit Number</Label>
              <Input type="number" min={1} value={unitForm.number} onChange={(e) => setUnitForm((f) => ({ ...f, number: parseInt(e.target.value) || 1 }))} />
              <p className="text-[11px] text-muted-foreground mt-1">Will be appended at the end automatically.</p>
            </div>
            <div>
              <Label>Unit Name</Label>
              <Input placeholder="e.g. Calculus" value={unitForm.name} onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <Label>Topics (comma separated)</Label>
              <Textarea placeholder="Limits, Continuity, Differentiation, Integration" value={unitForm.topics} onChange={(e) => setUnitForm((f) => ({ ...f, topics: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddUnitFor(null)}>Cancel</Button>
            <Button onClick={handleSaveUnit}><Save className="w-4 h-4 mr-1" /> Save Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
