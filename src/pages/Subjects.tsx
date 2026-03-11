import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Plus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "../components/AppLayout";
import CircularProgress from "../components/CircularProgress";
import SubjectProgressBar from "../components/SubjectProgressBar";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getUnitsWithTopics } from "@/lib/units-store";
import { getSubtopicsForTopics, type Subtopic } from "@/lib/subtopics-store";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export default function Subjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, { unitsDone: number; topicsDone: number; topicsTotal: number }>>({});

  const loadAll = useCallback(async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
      const prog: typeof progress = {};
      await Promise.all(data.map(async (s) => {
        try {
          const units = await getUnitsWithTopics(s.id);
          const allTopicIds = units.flatMap(u => (u.topics || []).map(t => t.id));
          const subtopics = allTopicIds.length > 0 ? await getSubtopicsForTopics(allTopicIds) : [];
          const subMap: Record<string, Subtopic[]> = {};
          subtopics.forEach(st => { if (!subMap[st.topic_id]) subMap[st.topic_id] = []; subMap[st.topic_id].push(st); });

          let topicsTotal = 0;
          let topicsDone = 0;
          units.forEach(u => {
            (u.topics || []).forEach(t => {
              const subs = subMap[t.id] || [];
              if (subs.length > 0) {
                topicsTotal += subs.length;
                topicsDone += subs.filter(s => s.is_completed).length;
              } else {
                topicsTotal += 1;
                topicsDone += t.is_completed ? 1 : 0;
              }
            });
          });

          const unitsDone = units.filter(u => {
            const topics = u.topics || [];
            if (topics.length === 0) return false;
            return topics.every(t => {
              const subs = subMap[t.id] || [];
              if (subs.length > 0) return subs.every(s => s.is_completed);
              return t.is_completed;
            });
          }).length;
          prog[s.id] = { unitsDone, topicsDone, topicsTotal };
        } catch { prog[s.id] = { unitsDone: 0, topicsDone: 0, topicsTotal: 0 }; }
      }));
      setProgress(prog);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useRealtimeSubscription("subjects", loadAll);
  useRealtimeSubscription("topics", loadAll);
  useRealtimeSubscription("subtopics", loadAll);

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SPPU Subjects</h1>
            <p className="text-sm text-muted-foreground mt-1">2024 Pattern — Click a subject to manage units & topics</p>
          </div>
          <Button onClick={() => navigate("/subject-management")}>
            <Plus className="w-4 h-4 mr-1" /> Manage Subjects
          </Button>
        </div>

        {subjects.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Subjects Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">Go to Subject Management to add your SPPU subjects.</p>
            <Button onClick={() => navigate("/subject-management")}><Plus className="w-4 h-4 mr-1" /> Create Your First Subject</Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subj) => {
              const p = progress[subj.id] || { unitsDone: 0, topicsDone: 0, topicsTotal: 0 };
              const segments = Array.from({ length: subj.target_units }, (_, i) => ({ filled: i < p.unitsDone }));
              return (
                <motion.div key={subj.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                  onClick={() => navigate(`/subject/${subj.id}`)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <CircularProgress segments={segments} size={64} strokeWidth={5} label="units" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{subj.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">{subj.code}</p>
                    </div>
                  </div>
                  <SubjectProgressBar done={p.topicsDone} total={p.topicsTotal} className="mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>{p.topicsDone}/{p.topicsTotal} items</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1"
                        onClick={(e) => { e.stopPropagation(); navigate(`/study-timer?subject=${subj.id}`); }}>
                        <Play className="w-3 h-3" /> Timer
                      </Button>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
