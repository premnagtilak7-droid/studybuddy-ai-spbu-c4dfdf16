import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "../components/AppLayout";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";

export default function Subjects() {
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjects().then((data) => {
      setSubjects(data);
      if (data.length > 0) setExpanded(data[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SPPU Subjects</h1>
            <p className="text-sm text-muted-foreground mt-1">2024 Pattern — Your Subjects</p>
          </div>
          <Button onClick={() => window.location.href = "/subject-management"}>
            <Plus className="w-4 h-4 mr-1" /> Manage Subjects
          </Button>
        </div>

        {subjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 text-center"
          >
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Subjects Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Go to Subject Management to add your SPPU subjects.
            </p>
            <Button onClick={() => window.location.href = "/subject-management"}>
              <Plus className="w-4 h-4 mr-1" /> Create Your First Subject
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {subjects.map((subj) => {
              const isOpen = expanded === subj.id;
              return (
                <motion.div key={subj.id} layout className="glass-card overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : subj.id)}
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
                          {subj.completed_units}/{subj.target_units} units completed
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
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-muted-foreground">
                            Target: {subj.target_units} units
                          </p>
                          <div className="w-32 h-2 bg-secondary rounded-full">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (subj.completed_units / subj.target_units) * 100)}%`,
                                background: `hsl(var(--${subj.color}))`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

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
