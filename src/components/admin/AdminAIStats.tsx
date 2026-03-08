import { motion } from "framer-motion";
import { Brain, Zap, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type Props = {
  doubts: { user_id: string; question: string; created_at: string; subject_id: string | null }[];
  subjects: { id: string; name: string }[];
  studyPlansCount: number;
};

export default function AdminAIStats({ doubts, subjects, studyPlansCount }: Props) {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const today = doubts.filter(d => new Date(d.created_at) >= daysAgo(1)).length;
  const thisWeek = doubts.filter(d => new Date(d.created_at) >= daysAgo(7)).length;
  const thisMonth = doubts.filter(d => new Date(d.created_at) >= daysAgo(30)).length;

  // Subject breakdown
  const subjectCounts: Record<string, number> = {};
  doubts.forEach(d => {
    if (d.subject_id) {
      const sub = subjects.find(s => s.id === d.subject_id);
      const name = sub?.name || "Unknown";
      subjectCounts[name] = (subjectCounts[name] || 0) + 1;
    } else {
      subjectCounts["General"] = (subjectCounts["General"] || 0) + 1;
    }
  });
  const subjectChartData = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Daily trend
  const dailyTrend = Array.from({ length: 14 }, (_, i) => {
    const date = daysAgo(13 - i);
    const dateStr = date.toISOString().slice(0, 10);
    const count = doubts.filter(d => d.created_at.slice(0, 10) === dateStr).length;
    return { date: date.toLocaleDateString("en", { month: "short", day: "numeric" }), count };
  });

  const StatCard = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) => (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );

  const chartConfig = { count: { label: "Queries", color: "hsl(var(--primary))" } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Brain} label="AI Queries Today" value={today} />
        <StatCard icon={TrendingUp} label="This Week" value={thisWeek} />
        <StatCard icon={Zap} label="This Month" value={thisMonth} />
        <StatCard icon={Clock} label="Study Plans Generated" value={studyPlansCount} />
      </div>

      {/* Daily Trend */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">AI Queries (14 days)</h3>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Subject Breakdown */}
      {subjectChartData.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Most Asked Subjects</h3>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={subjectChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      )}

      {/* Recent Queries */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent AI Queries</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {doubts.slice(0, 20).map((d, i) => (
            <div key={i} className="bg-secondary/50 px-3 py-2 rounded-lg text-xs text-foreground truncate">
              {d.question}
              <span className="text-muted-foreground ml-2">{new Date(d.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {doubts.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No queries yet</p>}
        </div>
      </div>
    </motion.div>
  );
}
