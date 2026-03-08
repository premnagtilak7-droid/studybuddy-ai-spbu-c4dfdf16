import { motion } from "framer-motion";
import { FileText, Download, TrendingUp, Users, CreditCard, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type Props = {
  profiles: { user_id: string; email: string; is_subscribed: boolean; created_at: string }[];
  studyLogs: { user_id: string; duration_minutes: number; logged_at: string }[];
  doubts: { created_at: string }[];
  activityLogs: { feature: string; created_at: string }[];
};

export default function AdminReports({ profiles, studyLogs, doubts, activityLogs }: Props) {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  // This week vs last week comparison
  const thisWeekUsers = profiles.filter(p => new Date(p.created_at) >= daysAgo(7)).length;
  const lastWeekUsers = profiles.filter(p => {
    const d = new Date(p.created_at);
    return d >= daysAgo(14) && d < daysAgo(7);
  }).length;

  const thisWeekLogs = studyLogs.filter(l => new Date(l.logged_at) >= daysAgo(7));
  const lastWeekLogs = studyLogs.filter(l => {
    const d = new Date(l.logged_at);
    return d >= daysAgo(14) && d < daysAgo(7);
  });

  const thisWeekDoubts = doubts.filter(d => new Date(d.created_at) >= daysAgo(7)).length;
  const lastWeekDoubts = doubts.filter(d => {
    const dt = new Date(d.created_at);
    return dt >= daysAgo(14) && dt < daysAgo(7);
  }).length;

  const thisWeekHours = (thisWeekLogs.reduce((a, l) => a + l.duration_minutes, 0) / 60).toFixed(1);
  const lastWeekHours = (lastWeekLogs.reduce((a, l) => a + l.duration_minutes, 0) / 60).toFixed(1);

  // This month vs last month
  const thisMonthUsers = profiles.filter(p => new Date(p.created_at) >= daysAgo(30)).length;
  const lastMonthUsers = profiles.filter(p => {
    const d = new Date(p.created_at);
    return d >= daysAgo(60) && d < daysAgo(30);
  }).length;

  // Daily report data
  const todayNewUsers = profiles.filter(p => new Date(p.created_at) >= daysAgo(1)).length;
  const todayActiveUsers = new Set(activityLogs.filter(a => new Date(a.created_at) >= daysAgo(1)).map((a: any) => a.user_id)).size;
  const todayDoubts = doubts.filter(d => new Date(d.created_at) >= daysAgo(1)).length;

  // Top features today
  const todayFeatures: Record<string, number> = {};
  activityLogs.filter(a => new Date(a.created_at) >= daysAgo(1)).forEach(a => {
    todayFeatures[a.feature] = (todayFeatures[a.feature] || 0) + 1;
  });
  const topFeatures = Object.entries(todayFeatures).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const comparison = [
    { metric: "New Users", thisWeek: thisWeekUsers, lastWeek: lastWeekUsers },
    { metric: "Study Hours", thisWeek: Number(thisWeekHours), lastWeek: Number(lastWeekHours) },
    { metric: "AI Queries", thisWeek: thisWeekDoubts, lastWeek: lastWeekDoubts },
  ];

  const exportReport = () => {
    const report = {
      generated: new Date().toISOString(),
      daily: { newUsers: todayNewUsers, activeUsers: todayActiveUsers, aiQueries: todayDoubts, topFeatures },
      weekly: { thisWeek: { users: thisWeekUsers, hours: thisWeekHours, doubts: thisWeekDoubts },
                lastWeek: { users: lastWeekUsers, hours: lastWeekHours, doubts: lastWeekDoubts } },
      monthly: { thisMonth: thisMonthUsers, lastMonth: lastMonthUsers },
      totals: { totalUsers: profiles.length, premiumUsers: profiles.filter(p => p.is_subscribed).length },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  };

  const chartConfig = {
    thisWeek: { label: "This Week", color: "hsl(var(--primary))" },
    lastWeek: { label: "Last Week", color: "hsl(var(--muted-foreground))" },
  };

  const CompareCard = ({ label, current, previous }: { label: string; current: number; previous: number }) => {
    const diff = previous > 0 ? ((current - previous) / previous * 100).toFixed(0) : current > 0 ? "+100" : "0";
    const isUp = current >= previous;
    return (
      <div className="bg-secondary/50 p-3 rounded-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{current}</p>
        <p className={`text-[10px] font-mono ${isUp ? "text-green-600" : "text-destructive"}`}>
          {isUp ? "↑" : "↓"} {diff}% vs prev
        </p>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Today's Report */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Today's Report
          </h3>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="w-4 h-4 mr-1" /> Export Report
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-secondary/50 p-3 rounded-lg">
            <p className="text-xl font-bold text-foreground">{todayNewUsers}</p>
            <p className="text-xs text-muted-foreground">New Users</p>
          </div>
          <div className="bg-secondary/50 p-3 rounded-lg">
            <p className="text-xl font-bold text-foreground">{todayActiveUsers}</p>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </div>
          <div className="bg-secondary/50 p-3 rounded-lg">
            <p className="text-xl font-bold text-foreground">{todayDoubts}</p>
            <p className="text-xs text-muted-foreground">AI Queries</p>
          </div>
          <div className="bg-secondary/50 p-3 rounded-lg">
            <p className="text-xl font-bold text-foreground">{topFeatures[0]?.[0]?.replace(/_/g, " ") || "—"}</p>
            <p className="text-xs text-muted-foreground">Top Feature</p>
          </div>
        </div>
      </div>

      {/* Week Comparison */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> This Week vs Last Week
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <CompareCard label="New Users" current={thisWeekUsers} previous={lastWeekUsers} />
          <CompareCard label="Study Hours" current={Number(thisWeekHours)} previous={Number(lastWeekHours)} />
          <CompareCard label="AI Queries" current={thisWeekDoubts} previous={lastWeekDoubts} />
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={comparison}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="thisWeek" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lastWeek" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Month Comparison */}
      <div className="glass-card p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" /> Monthly Comparison
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <CompareCard label="New Users (This Month)" current={thisMonthUsers} previous={lastMonthUsers} />
          <CompareCard label="Total Users" current={profiles.length} previous={profiles.length - thisMonthUsers} />
        </div>
      </div>
    </motion.div>
  );
}
