import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Star, ChevronRight, Zap, FileText } from "lucide-react";
import AppLayout from "../components/AppLayout";

type Topic = { name: string; marks: number; isHighWeight: boolean; completed: boolean };
type Subject = {
  name: string;
  code: string;
  color: string;
  topics: Topic[];
};

const subjects: Subject[] = [
  {
    name: "Basic Electrical Engineering",
    code: "BEE",
    color: "chart-1",
    topics: [
      { name: "DC Circuits & Kirchhoff's Laws", marks: 8, isHighWeight: true, completed: true },
      { name: "Star-Delta Transformation", marks: 12, isHighWeight: true, completed: false },
      { name: "AC Fundamentals", marks: 6, isHighWeight: false, completed: true },
      { name: "Single Phase Transformer", marks: 8, isHighWeight: true, completed: false },
      { name: "Three Phase Systems", marks: 6, isHighWeight: false, completed: false },
      { name: "Electrical Safety & Earthing", marks: 4, isHighWeight: false, completed: true },
    ],
  },
  {
    name: "Engineering Mechanics",
    code: "EM",
    color: "chart-2",
    topics: [
      { name: "Coplanar Force Systems", marks: 6, isHighWeight: false, completed: true },
      { name: "Truss Analysis (Method of Joints)", marks: 10, isHighWeight: true, completed: false },
      { name: "Centroid & Moment of Inertia", marks: 8, isHighWeight: true, completed: false },
      { name: "Friction", marks: 6, isHighWeight: false, completed: true },
      { name: "Kinematics & Kinetics", marks: 8, isHighWeight: true, completed: false },
      { name: "Simple Machines", marks: 4, isHighWeight: false, completed: false },
    ],
  },
  {
    name: "Mathematics II",
    code: "M2",
    color: "chart-3",
    topics: [
      { name: "Laplace Transforms", marks: 10, isHighWeight: true, completed: true },
      { name: "Inverse Laplace Transform", marks: 8, isHighWeight: true, completed: false },
      { name: "Fourier Series", marks: 8, isHighWeight: true, completed: false },
      { name: "Vector Differentiation", marks: 6, isHighWeight: false, completed: true },
      { name: "Vector Integration", marks: 6, isHighWeight: false, completed: false },
      { name: "Complex Variables", marks: 4, isHighWeight: false, completed: false },
    ],
  },
];

export default function Subjects() {
  const [expanded, setExpanded] = useState<string | null>("BEE");

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SPPU Subjects</h1>
          <p className="text-sm text-muted-foreground mt-1">2024 Pattern — FE Semester II</p>
        </div>

        {/* Subject Cards */}
        <div className="space-y-4">
          {subjects.map((subj) => {
            const isOpen = expanded === subj.code;
            const completedCount = subj.topics.filter((t) => t.completed).length;
            const highWeightIncomplete = subj.topics.filter((t) => t.isHighWeight && !t.completed);

            return (
              <motion.div
                key={subj.code}
                layout
                className="glass-card overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : subj.code)}
                  className="w-full p-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm font-mono text-primary-foreground"
                      style={{ background: `hsl(var(--${subj.color}))` }}
                    >
                      {subj.code}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{subj.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">
                        {completedCount}/{subj.topics.length} topics · {highWeightIncomplete.length} high-weight pending
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                </button>

                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    className="border-t border-border px-5 pb-5"
                  >
                    <div className="pt-4 space-y-2">
                      {subj.topics.map((topic, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            topic.completed ? "bg-success/5" : topic.isHighWeight ? "bg-accent/5" : "bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {topic.isHighWeight && <Star className="w-4 h-4 text-accent flex-shrink-0" />}
                            {!topic.isHighWeight && <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                            <div>
                              <p className={`text-sm font-medium ${topic.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                {topic.name}
                              </p>
                              <p className="text-[11px] font-mono text-muted-foreground">{topic.marks} marks</p>
                            </div>
                          </div>
                          {topic.isHighWeight && !topic.completed && (
                            <span className="flex items-center gap-1 text-[10px] font-bold font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                              <Zap className="w-3 h-3" /> SCORE MAX
                            </span>
                          )}
                          {topic.completed && (
                            <span className="text-[10px] font-mono text-success">✓ Done</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Premium Banner */}
        <div className="glass-card p-5 gradient-primary">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-primary-foreground text-lg">Premium SPPU Notes</h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                Get curated chapter-wise notes, PYQs with solutions, and Score Max strategies
              </p>
            </div>
            <button className="bg-primary-foreground text-primary px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
              Upgrade ₹199/sem
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
