import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, BookOpen, Target, TrendingUp, Calendar } from "lucide-react";
import StudyHeatmap from "../components/StudyHeatmap";
import SubjectChart from "../components/SubjectChart";
import AppLayout from "../components/AppLayout";
import { getSubjects } from "@/lib/subjects-store";

const dateFilters = ["Yesterday", "Today", "This Week", "6 Months", "1 Year", "Custom"];

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("This Week");
  
  const subjects = useMemo(() => getSubjects(), []);
  const completedSubjects = subjects.filter(s => s.completedUnits >= s.targetUnits).length;

  const statCards = [
    { label: "Today's Hours", value: "4.5h", icon: Clock, change: "+1.2h", color: "primary" },
    { label: "Current Streak", value: "12 days", icon: Flame, change: "🔥 Best: 23", color: "accent" },
    { label: "Subjects Covered", value: `${completedSubjects}/${subjects.length}`, icon: BookOpen, change: subjects.length > 0 ? "Click to manage" : "Add subjects", color: "success", clickable: true },
    { label: "Weekly Target", value: "78%", icon: Target, change: "31.2/40h", color: "primary" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stats Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your SPPU study progress</p>
        </div>

        {/* Date Filters */}
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

        {/* Stat Cards */}
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

        {/* Heatmap */}
        <StudyHeatmap />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SubjectChart />

          {/* Quick Actions / Score Max */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent" />
              Score Max — High Weightage Topics
            </h3>
            <p className="text-xs text-muted-foreground font-mono mb-4">Focus on these for maximum marks</p>

            <div className="space-y-3">
              {[
                { topic: "Star-Delta Transformation", subject: "BEE", weight: "12 marks", priority: "high" },
                { topic: "Truss Analysis (Method of Joints)", subject: "Mechanics", weight: "10 marks", priority: "high" },
                { topic: "Laplace Transforms", subject: "Maths II", weight: "10 marks", priority: "medium" },
                { topic: "Kirchhoff's Laws", subject: "BEE", weight: "8 marks", priority: "medium" },
                { topic: "Centroid & Moment of Inertia", subject: "Mechanics", weight: "8 marks", priority: "medium" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.topic}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{item.subject}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{item.weight}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.priority === "high" ? "bg-accent animate-pulse-glow" : "bg-primary"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
