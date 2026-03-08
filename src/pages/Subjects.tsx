import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "../components/AppLayout";
import CircularProgress from "../components/CircularProgress";
import SubjectProgressBar from "../components/SubjectProgressBar";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { getUnitsWithTopics } from "@/lib/units-store";

export default function Subjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, { unitsDone: number; topicsDone: number; topicsTotal: number }>>({});

  useEffect(() => {
    getSubjects().then(async (data) => {
      setSubjects(data);
      const prog: typeof progress = {};
      await Promise.all(data.map(async (s) => {
        try {
          const units = await getUnitsWithTopics(s.id);
          const topicsTotal = units.reduce((a, u) => a + (u.topics?.length || 0), 0);
          const topicsDone = units.reduce((a, u) => a + (u.topics?.filter(t => t.is_completed).length || 0), 0);
          const unitsDone = units.filter(u => {
            const topics = u.topics || [];
            return topics.length > 0 && topics.every(t => t.is_completed);
          }).length;
          prog[s.id] = { unitsDone, topicsDone, topicsTotal };
        } catch { prog[s.id] = { unitsDone: 0, topicsDone: 0, topicsTotal: 0 }; }
      }));
      setProgress(prog);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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
              const segments = Array.from({ length: 6 }, (_, i) => ({ filled: i < p.unitsDone }));
              return (
                <motion.div
                  key={subj.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                  onClick={() => navigate(`/subject/${subj.id}`)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <CircularProgress segments={segments} size={64} strokeWidth={5} label="units" />
                    <div>
                      <h3 className="font-semibold text-foreground">{subj.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">{subj.code}</p>
                    </div>
                  </div>
                  <SubjectProgressBar done={p.topicsDone} total={p.topicsTotal} className="mb-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>{p.topicsDone}/{p.topicsTotal} topics</span>
                    <ChevronRight className="w-4 h-4" />
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
