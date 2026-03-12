import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, ChevronDown, ChevronRight, Trash2, Check, Target, Play, StickyNote } from "lucide-react";
import AppLayout from "../components/AppLayout";
import CircularProgress from "../components/CircularProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { getSubjects, updateSubject, type UserSubject } from "@/lib/subjects-store";
import {
  getUnitsWithTopics, addTopic, toggleTopic, updateTopicPriority, deleteTopic, type Unit,
} from "@/lib/units-store";
import {
  getSubtopicsForTopics, addSubtopic, toggleSubtopic, updateSubtopicDifficulty,
  updateSubtopicNotes, deleteSubtopic, type Subtopic,
} from "@/lib/subtopics-store";
import { recordStudySession, setLastStudied } from "@/lib/study-tracker";
import { awardXP } from "@/lib/xp-store";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  low: "bg-muted text-muted-foreground border-border",
};
const priorityLabels: Record<string, string> = { high: "High", medium: "Med", low: "Low" };
const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/15 text-green-600 border-green-500/30",
  medium: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  hard: "bg-red-500/15 text-red-600 border-red-500/30",
};

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<UserSubject | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [newTopic, setNewTopic] = useState("");
  const [addingUnit, setAddingUnit] = useState<string | null>(null);
  const [addingSubtopic, setAddingSubtopic] = useState<string | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState(false);
  const [gradeInput, setGradeInput] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [subs, unitsData] = await Promise.all([getSubjects(), getUnitsWithTopics(id)]);
      const found = subs.find((s) => s.id === id) || null;
      setSubject(found);
      setUnits(unitsData);
      if (found) setGradeInput(found.target_grade?.toString() || "");
      if (unitsData.length > 0 && !expanded) setExpanded(unitsData[0].id);

      // Load subtopics for all topics
      const allTopicIds = unitsData.flatMap(u => (u.topics || []).map(t => t.id));
      if (allTopicIds.length > 0) {
        const subtopics = await getSubtopicsForTopics(allTopicIds);
        const map: Record<string, Subtopic[]> = {};
        subtopics.forEach(st => {
          if (!map[st.topic_id]) map[st.topic_id] = [];
          map[st.topic_id].push(st);
        });
        setSubtopicsMap(map);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime sync
  useRealtimeSubscription("topics", loadData);
  useRealtimeSubscription("subtopics", loadData);
  useRealtimeSubscription("units", loadData);

  const handleAddTopic = async (unitId: string) => {
    if (!newTopic.trim()) return;
    try {
      await addTopic(unitId, newTopic.trim());
      setNewTopic("");
      setAddingUnit(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (topicId: string, current: boolean, topicName: string, unitName: string) => {
    try {
      await toggleTopic(topicId, !current);
      if (!current && subject) {
        recordStudySession();
        setLastStudied({ subjectId: subject.id, subjectName: subject.name, topicName, unitName, timestamp: Date.now() });
        const amount = await awardXP("topic_complete");
        if (amount > 0) toast.success(`+${amount} XP for completing topic!`);
      }
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePriority = async (topicId: string, p: "high" | "medium" | "low") => {
    try { await updateTopicPriority(topicId, p); loadData(); } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (topicId: string) => {
    try { await deleteTopic(topicId); loadData(); } catch (err: any) { toast.error(err.message); }
  };

  const handleAddSubtopic = async (topicId: string) => {
    if (!newSubtopicName.trim()) return;
    try {
      await addSubtopic(topicId, newSubtopicName.trim());
      setNewSubtopicName("");
      setAddingSubtopic(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleSubtopic = async (id: string, current: boolean) => {
    try { await toggleSubtopic(id, !current); loadData(); } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteSubtopic = async (id: string) => {
    try { await deleteSubtopic(id); loadData(); } catch (err: any) { toast.error(err.message); }
  };

  const handleSubtopicDifficulty = async (id: string, d: "easy" | "medium" | "hard") => {
    try { await updateSubtopicDifficulty(id, d); loadData(); } catch (err: any) { toast.error(err.message); }
  };

  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId); else next.add(topicId);
      return next;
    });
  };

  const handleSaveGrade = async () => {
    if (!subject) return;
    const val = gradeInput.trim() ? parseFloat(gradeInput) : null;
    if (val !== null && (isNaN(val) || val < 0 || val > 10)) { toast.error("Enter a valid grade (0-10)"); return; }
    try {
      await updateSubject(subject.id, { target_grade: val });
      toast.success(val ? `Target grade set to ${val}` : "Target grade removed");
      setEditingGrade(false);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></AppLayout>;
  }
  if (!subject) {
    return <AppLayout><div className="text-center py-16"><p className="text-muted-foreground">Subject not found</p><Button onClick={() => navigate("/subjects")} className="mt-4">Back to Subjects</Button></div></AppLayout>;
  }

  // Progress calculation including subtopics
  const getTopicCompletion = (topicId: string, topicCompleted: boolean) => {
    const subs = subtopicsMap[topicId] || [];
    if (subs.length === 0) return topicCompleted ? 1 : 0;
    const done = subs.filter(s => s.is_completed).length;
    return done / subs.length;
  };

  const segments = units.map((u) => {
    const topics = u.topics || [];
    if (topics.length === 0) return { filled: false };
    const avgCompletion = topics.reduce((sum, t) => sum + getTopicCompletion(t.id, t.is_completed), 0) / topics.length;
    return { filled: avgCompletion >= 1 };
  });

  const totalItems = units.reduce((a, u) => {
    return a + (u.topics || []).reduce((b, t) => {
      const subs = subtopicsMap[t.id] || [];
      return b + (subs.length > 0 ? subs.length : 1);
    }, 0);
  }, 0);
  const completedItems = units.reduce((a, u) => {
    return a + (u.topics || []).reduce((b, t) => {
      const subs = subtopicsMap[t.id] || [];
      if (subs.length > 0) return b + subs.filter(s => s.is_completed).length;
      return b + (t.is_completed ? 1 : 0);
    }, 0);
  }, 0);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/subjects")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <CircularProgress segments={segments} size={72} label="units" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground truncate">{subject.name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                {subject.code} · {completedItems}/{totalItems} items done
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/study-timer?subject=${subject.id}`)} className="gap-1.5">
              <Play className="w-3.5 h-3.5" /> Study Timer
            </Button>
            {editingGrade ? (
              <div className="flex items-center gap-1">
                <Input value={gradeInput} onChange={(e) => setGradeInput(e.target.value)} placeholder="e.g. 9.0" className="w-20 text-sm" type="number" step="0.1" min="0" max="10" autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()} />
                <Button size="sm" onClick={handleSaveGrade}><Check className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingGrade(false)}>✕</Button>
              </div>
            ) : (
              <button onClick={() => setEditingGrade(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-foreground">{subject.target_grade ? `${subject.target_grade} CGPA` : "Set Target"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Units accordion */}
        <div className="space-y-3">
          {units.map((unit) => {
            const isOpen = expanded === unit.id;
            const topics = unit.topics || [];
            const unitDoneCount = topics.reduce((sum, t) => {
              const subs = subtopicsMap[t.id] || [];
              if (subs.length > 0) return sum + (subs.every(s => s.is_completed) ? 1 : 0);
              return sum + (t.is_completed ? 1 : 0);
            }, 0);
            const unitComplete = topics.length > 0 && unitDoneCount === topics.length;

            return (
              <motion.div key={unit.id} layout className="glass-card overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : unit.id)} className="w-full px-5 py-4 flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${unitComplete ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      U{unit.unit_number}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{unit.name}</h3>
                      <p className="text-[11px] font-mono text-muted-foreground">{unitDoneCount}/{topics.length} topics {unitComplete && "✓"}</p>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-t border-border">
                    <div className="p-4 space-y-2">
                      {topics.map((topic) => {
                        const topicSubs = subtopicsMap[topic.id] || [];
                        const subsDone = topicSubs.filter(s => s.is_completed).length;
                        const subsProgress = topicSubs.length > 0 ? Math.round((subsDone / topicSubs.length) * 100) : (topic.is_completed ? 100 : 0);
                        const isTopicExpanded = expandedTopics.has(topic.id);

                        return (
                          <div key={topic.id} className="rounded-lg border border-border/50">
                            {/* Topic row */}
                            <div className="flex items-center gap-3 p-2.5 hover:bg-secondary/50 transition-colors group">
                              <Checkbox checked={topic.is_completed} onCheckedChange={() => handleToggle(topic.id, topic.is_completed, topic.name, unit.name)} />
                              <button onClick={() => toggleTopicExpand(topic.id)} className="flex-1 text-left min-w-0">
                                <span className={`text-sm ${topic.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{topic.name}</span>
                                {topicSubs.length > 0 && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Progress value={subsProgress} className="h-1.5 flex-1 max-w-24" />
                                    <span className="text-[10px] font-mono text-muted-foreground">{subsDone}/{topicSubs.length}</span>
                                  </div>
                                )}
                              </button>
                              <div className="flex items-center gap-1">
                                {(["high", "medium", "low"] as const).map((p) => (
                                  <button key={p} onClick={() => handlePriority(topic.id, p)} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${topic.priority === p ? priorityColors[p] : "border-transparent text-muted-foreground opacity-0 group-hover:opacity-50"}`}>
                                    {priorityLabels[p]}
                                  </button>
                                ))}
                                <button onClick={() => handleDelete(topic.id)} className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <button onClick={() => toggleTopicExpand(topic.id)} className="p-1 text-muted-foreground">
                                  {isTopicExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            {/* Subtopics */}
                            {isTopicExpanded && (
                              <div className="pl-9 pr-3 pb-2.5 space-y-1.5">
                                {topicSubs.map(sub => (
                                  <div key={sub.id} className="rounded hover:bg-secondary/30 transition-colors group/sub">
                                    <div className="flex items-center gap-2 p-1.5">
                                      <Checkbox checked={sub.is_completed} onCheckedChange={() => handleToggleSubtopic(sub.id, sub.is_completed)} className="scale-90" />
                                      <span className={`flex-1 text-xs ${sub.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{sub.name}</span>
                                      <div className="flex items-center gap-1">
                                        {(["easy", "medium", "hard"] as const).map(d => (
                                          <button key={d} onClick={() => handleSubtopicDifficulty(sub.id, d)} className={`px-1 py-0.5 rounded text-[9px] font-mono border transition-all ${sub.difficulty === d ? difficultyColors[d] : "border-transparent text-muted-foreground opacity-0 group-hover/sub:opacity-50"}`}>
                                            {d[0].toUpperCase()}
                                          </button>
                                        ))}
                                        <button onClick={() => setEditingNotes(editingNotes === sub.id ? null : sub.id)} className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-all">
                                          <StickyNote className="w-2.5 h-2.5" />
                                        </button>
                                        <button onClick={() => handleDeleteSubtopic(sub.id)} className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-destructive hover:bg-destructive/10 rounded transition-all">
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                    {editingNotes === sub.id && (
                                      <div className="px-7 pb-2">
                                        <Textarea
                                          value={notesInput[sub.id] ?? sub.notes ?? ""}
                                          onChange={e => setNotesInput(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                          placeholder="Add notes..."
                                          rows={2}
                                          className="text-xs h-auto"
                                        />
                                        <div className="flex gap-1 mt-1">
                                          <Button size="sm" className="h-6 text-[10px]" onClick={async () => {
                                            try {
                                              await updateSubtopicNotes(sub.id, notesInput[sub.id] ?? sub.notes ?? "");
                                              toast.success("Notes saved");
                                              setEditingNotes(null);
                                              loadData();
                                            } catch (err: any) { toast.error(err.message); }
                                          }}>Save</Button>
                                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingNotes(null)}>Cancel</Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {addingSubtopic === topic.id ? (
                                  <div className="flex gap-2 mt-1">
                                    <Input value={newSubtopicName} onChange={e => setNewSubtopicName(e.target.value)} placeholder="Subtopic name..." className="text-xs h-7" autoFocus onKeyDown={e => e.key === "Enter" && handleAddSubtopic(topic.id)} />
                                    <Button size="sm" className="h-7 text-xs" onClick={() => handleAddSubtopic(topic.id)}><Check className="w-3 h-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingSubtopic(null); setNewSubtopicName(""); }}>✕</Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => setAddingSubtopic(topic.id)} className="w-full h-6 text-[10px] text-muted-foreground mt-1">
                                    <Plus className="w-2.5 h-2.5 mr-0.5" /> Add Subtopic
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {addingUnit === unit.id ? (
                        <div className="flex gap-2 mt-2">
                          <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Topic name..." className="text-sm" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddTopic(unit.id)} />
                          <Button size="sm" onClick={() => handleAddTopic(unit.id)}><Check className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddingUnit(null); setNewTopic(""); }}>Cancel</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setAddingUnit(unit.id)} className="w-full mt-1 text-muted-foreground">
                          <Plus className="w-3 h-3 mr-1" /> Add Topic
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
