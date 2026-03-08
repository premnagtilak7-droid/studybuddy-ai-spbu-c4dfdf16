import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, ChevronDown, ChevronRight, Trash2, Check, Target } from "lucide-react";
import AppLayout from "../components/AppLayout";
import CircularProgress from "../components/CircularProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getSubjects, updateSubject, type UserSubject } from "@/lib/subjects-store";
import {
  getUnitsWithTopics,
  addTopic,
  toggleTopic,
  updateTopicPriority,
  deleteTopic,
  type Unit,
} from "@/lib/units-store";
import { recordStudySession, setLastStudied } from "@/lib/study-tracker";
import { awardXP } from "@/lib/xp-store";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  low: "bg-muted text-muted-foreground border-border",
};
const priorityLabels: Record<string, string> = { high: "High", medium: "Med", low: "Low" };

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<UserSubject | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [addingUnit, setAddingUnit] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState(false);
  const [gradeInput, setGradeInput] = useState("");

  const loadData = async () => {
    if (!id) return;
    try {
      const [subs, unitsData] = await Promise.all([getSubjects(), getUnitsWithTopics(id)]);
      const found = subs.find((s) => s.id === id) || null;
      setSubject(found);
      setUnits(unitsData);
      if (found) setGradeInput(found.target_grade?.toString() || "");
      if (unitsData.length > 0 && !expanded) setExpanded(unitsData[0].id);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

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
      // Track study activity and award XP when marking complete
      if (!current && subject) {
        recordStudySession();
        setLastStudied({
          subjectId: subject.id,
          subjectName: subject.name,
          topicName,
          unitName,
          timestamp: Date.now(),
        });
        const amount = await awardXP("topic_complete");
        if (amount > 0) toast.success(`+${amount} XP for completing topic!`);
      }
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePriority = async (topicId: string, p: "high" | "medium" | "low") => {
    try {
      await updateTopicPriority(topicId, p);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (topicId: string) => {
    try {
      await deleteTopic(topicId);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveGrade = async () => {
    if (!subject) return;
    const val = gradeInput.trim() ? parseFloat(gradeInput) : null;
    if (val !== null && (isNaN(val) || val < 0 || val > 10)) {
      toast.error("Enter a valid grade (0-10)");
      return;
    }
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
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Subject not found</p>
          <Button onClick={() => navigate("/subjects")} className="mt-4">Back to Subjects</Button>
        </div>
      </AppLayout>
    );
  }

  const segments = units.map((u) => {
    const topics = u.topics || [];
    const allDone = topics.length > 0 && topics.every((t) => t.is_completed);
    return { filled: allDone };
  });

  const totalTopics = units.reduce((a, u) => a + (u.topics?.length || 0), 0);
  const completedTopics = units.reduce((a, u) => a + (u.topics?.filter((t) => t.is_completed).length || 0), 0);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/subjects")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <CircularProgress segments={segments} size={72} label="units" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{subject.name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                {subject.code} · {completedTopics}/{totalTopics} topics done
              </p>
            </div>
          </div>
          {/* Target Grade */}
          <div className="flex items-center gap-2">
            {editingGrade ? (
              <div className="flex items-center gap-1">
                <Input
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="e.g. 9.0"
                  className="w-20 text-sm"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveGrade()}
                />
                <Button size="sm" onClick={handleSaveGrade}><Check className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingGrade(false)}>✕</Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingGrade(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-foreground">
                  {subject.target_grade ? `${subject.target_grade} CGPA` : "Set Target"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Units accordion */}
        <div className="space-y-3">
          {units.map((unit) => {
            const isOpen = expanded === unit.id;
            const topics = unit.topics || [];
            const done = topics.filter((t) => t.is_completed).length;
            const unitComplete = topics.length > 0 && done === topics.length;

            return (
              <motion.div key={unit.id} layout className="glass-card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : unit.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                      unitComplete ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}>
                      U{unit.unit_number}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{unit.name}</h3>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {done}/{topics.length} topics {unitComplete && "✓"}
                      </p>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>

                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-t border-border">
                    <div className="p-4 space-y-2">
                      {topics.map((topic) => (
                        <div key={topic.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group">
                          <Checkbox
                            checked={topic.is_completed}
                            onCheckedChange={() => handleToggle(topic.id, topic.is_completed, topic.name, unit.name)}
                          />
                          <span className={`flex-1 text-sm ${topic.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {topic.name}
                          </span>
                          <div className="flex items-center gap-1">
                            {(["high", "medium", "low"] as const).map((p) => (
                              <button
                                key={p}
                                onClick={() => handlePriority(topic.id, p)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
                                  topic.priority === p ? priorityColors[p] : "border-transparent text-muted-foreground opacity-0 group-hover:opacity-50"
                                }`}
                              >
                                {priorityLabels[p]}
                              </button>
                            ))}
                            <button
                              onClick={() => handleDelete(topic.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {addingUnit === unit.id ? (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                            placeholder="Topic name..."
                            className="text-sm"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleAddTopic(unit.id)}
                          />
                          <Button size="sm" onClick={() => handleAddTopic(unit.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setAddingUnit(null); setNewTopic(""); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingUnit(unit.id)}
                          className="w-full mt-1 text-muted-foreground"
                        >
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
