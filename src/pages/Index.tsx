import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, BookOpen, Target, TrendingUp, Plus } from "lucide-react";
import StudyHeatmap from "../components/StudyHeatmap";
import SubjectChart from "../components/SubjectChart";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";

const dateFilters = ["Yesterday", "Today", "This Week", "6 Months", "1 Year", "Custom"];

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("This Week");
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjects().then((data) => {
      setSubjects(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const completedSubjects = subjects.filter(s => s.completed_units >= s.target_units).length;

  const statCards = [
    { label: "Today's Hours", value: "0h", icon: Clock, change: "Start studying!", color: "primary" },
    { label: "Current Streak", value: "0 days", icon: Flame, change: "Build your streak", color: "accent" },
    { label: "Subjects Covered", value: `${completedSubjects}/${subjects.length}`, icon: BookOpen, change: subjects.length > 0 ? "Click to manage" : "Add subjects", color: "success", clickable: true },
    { label: "Weekly Target", value: "0%", icon: Target, change: "0/40h", color: "primary" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stats Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your SPPU study progress</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {dateFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
                activeFilter === f
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-4 ${(stat as any).clickable ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""}`}
              onClick={() => (stat as any).clickable && (window.location.href = "/subject-management")}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold font-mono mt-1 text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {stat.change}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${stat.color === "accent" ? "gradient-accent" : "gradient-primary"}`}>
                  <stat.icon className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {subjects.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 text-center"
          >
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Subjects Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Create your first subject to start tracking your SPPU study progress.
            </p>
            <Button onClick={() => window.location.href = "/subject-management"}>
              <Plus className="w-4 h-4 mr-1" /> Create Your First Subject
            </Button>
          </motion.div>
        ) : (
          <>
            <StudyHeatmap />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubjectChart subjects={subjects} />
              <div className="glass-card p-5">
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-accent" />
                  Your Subjects
                </h3>
                <p className="text-xs text-muted-foreground font-mono mb-4">Progress overview</p>
                <div className="space-y-3">
                  {subjects.map((subj) => (
                    <div
                      key={subj.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono text-primary-foreground"
                          style={{ background: `hsl(var(--${subj.color}))` }}
                        >
                          {subj.code}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{subj.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {subj.completed_units}/{subj.target_units} units
                          </p>
                        </div>
                      </div>
                      <div className="w-20 h-1.5 bg-secondary rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (subj.completed_units / subj.target_units) * 100)}%`,
                            background: `hsl(var(--${subj.color}))`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
