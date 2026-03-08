import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserSubject } from "@/lib/subjects-store";
import type { ExamDate } from "@/lib/exam-store";

interface Props {
  subjects: UserSubject[];
  examDates: ExamDate[];
  totalTopics: number;
  completedTopics: number;
  hasTimetable: boolean;
}

const TASKS = [
  { key: "subject", label: "Add your first subject" },
  { key: "topics", label: "Add topics to a subject" },
  { key: "exams", label: "Set exam dates" },
  { key: "timetable", label: "Build your timetable" },
  { key: "complete", label: "Complete your first topic" },
] as const;

export default function GettingStartedChecklist({ subjects, examDates, totalTopics, completedTopics, hasTimetable }: Props) {
  const completed = useMemo(() => {
    const set = new Set<string>();
    if (subjects.length > 0) set.add("subject");
    if (totalTopics > 0) set.add("topics");
    if (examDates.length > 0) set.add("exams");
    if (hasTimetable) set.add("timetable");
    if (completedTopics > 0) set.add("complete");
    return set;
  }, [subjects.length, examDates.length, totalTopics, completedTopics, hasTimetable]);

  const allDone = completed.size === TASKS.length;

  if (allDone) return null;

  const doneCount = completed.size;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            Getting Started
            <span className="ml-auto text-xs font-mono text-muted-foreground">
              {doneCount}/{TASKS.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {TASKS.map((task) => {
            const isDone = completed.has(task.key);
            return (
              <div key={task.key} className="flex items-center gap-2.5">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    isDone
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {task.label}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
