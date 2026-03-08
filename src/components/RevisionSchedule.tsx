import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw, ChevronRight, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { UserSubject } from "@/lib/subjects-store";

interface RevisionTopic {
  id: string;
  name: string;
  completed_at: string;
  unit_name: string;
  subject_name: string;
  subject_id: string;
  interval: number; // 1, 3, or 7
}

interface RevisionScheduleProps {
  subjects: UserSubject[];
}

export default function RevisionSchedule({ subjects }: RevisionScheduleProps) {
  const [topics, setTopics] = useState<RevisionTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (subjects.length === 0) {
      setLoading(false);
      return;
    }

    const fetchRevisionTopics = async () => {
      const now = new Date();
      const intervals = [1, 3, 7];
      const allTopics: RevisionTopic[] = [];

      for (const interval of intervals) {
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - interval);
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const { data } = await supabase
          .from("topics")
          .select("id, name, completed_at, unit_id")
          .eq("is_completed", true)
          .gte("completed_at", dayStart.toISOString())
          .lte("completed_at", dayEnd.toISOString());

        if (!data || data.length === 0) continue;

        // Get unit info for these topics
        const unitIds = [...new Set(data.map((t: any) => t.unit_id))];
        const { data: units } = await supabase
          .from("units")
          .select("id, name, subject_id")
          .in("id", unitIds);

        const unitMap = new Map((units || []).map((u: any) => [u.id, u]));
        const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

        for (const t of data) {
          const unit = unitMap.get(t.unit_id);
          if (!unit) continue;
          allTopics.push({
            id: t.id,
            name: t.name,
            completed_at: t.completed_at!,
            unit_name: unit.name,
            subject_name: subjectMap.get(unit.subject_id) || "Unknown",
            subject_id: unit.subject_id,
            interval,
          });
        }
      }

      setTopics(allTopics);
      setLoading(false);
    };

    fetchRevisionTopics();
  }, [subjects]);

  if (loading) return null;
  if (topics.length === 0) return null;

  const intervalLabel: Record<number, string> = {
    1: "1 day ago",
    3: "3 days ago",
    7: "7 days ago",
  };

  const intervalColor: Record<number, string> = {
    1: "bg-primary/10 text-primary",
    3: "bg-accent/10 text-accent",
    7: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-primary" />
          Revise Today
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {topics.length} topic{topics.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {topics.map((t) => (
          <button
            key={`${t.id}-${t.interval}`}
            onClick={() => navigate(`/subject/${t.subject_id}`)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {t.subject_name} › {t.unit_name}
              </p>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${intervalColor[t.interval]}`}>
              {intervalLabel[t.interval]}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
