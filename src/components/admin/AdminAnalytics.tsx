import { motion } from "framer-motion";
import { BarChart3, Clock, Smartphone, Monitor, Download, Users, Activity, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

type ActivityRow = { id?: string; user_id: string; feature: string; action: string; device_type: string | null; created_at: string };

type Props = {
  activityLogs: ActivityRow[];
  profiles?: { user_id: string; created_at: string; current_plan?: string }[];
};

export default function AdminAnalytics({ activityLogs, profiles = [] }: Props) {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  // Feature Usage
  const featureUsage: Record<string, number> = {};
  activityLogs.forEach(a => { featureUsage[a.feature] = (featureUsage[a.feature] || 0) + 1; });
  const featureChartData = Object.entries(featureUsage)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }));

  // DAU (30 days)
  const dauData = Array.from({ length: 30 }, (_, i) => {
    const date = daysAgo(29 - i);
    const dateStr = date.toISOString().slice(0, 10);
    const uniqueUsers = new Set(activityLogs.filter(a => a.created_at.slice(0, 10) === dateStr).map(a => a.user_id));
    return { date: date.toLocaleDateString("en", { month: "short", day: "numeric" }), dau: uniqueUsers.size };
  });

  // Average DAU
  const avgDAU = dauData.length > 0 ? (dauData.reduce((s, d) => s + d.dau, 0) / dauData.length).toFixed(1) : "0";

  // Peak hours
  const hourCounts = Array.from({ length: 24 }, (_, h) => {
    const count = activityLogs.filter(a => new Date(a.created_at).getHours() === h).length;
    return { hour: `${h}:00`, count };
  });

  // Device breakdown
  const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };
  activityLogs.forEach(a => {
    const d = (a.device_type || "desktop") as keyof typeof deviceCounts;
    if (d in deviceCounts) deviceCounts[d]++;
  });
  const totalDevices = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;

  // Average session time (estimate: group activities by user per day and compute avg gap)
  const userDaySessions: Record<string, number[]> = {};
  activityLogs.forEach(a => {
    const key = `${a.user_id}_${a.created_at.slice(0, 10)}`;
    if (!userDaySessions[key]) userDaySessions[key] = [];
    userDaySessions[key].push(new Date(a.created_at).getTime());
  });
  const sessionDurations: number[] = [];
  Object.values(userDaySessions).forEach(timestamps => {
    if (timestamps.length < 2) {
      sessionDurations.push(5); // min 5 min for single action
      return;
    }
    timestamps.sort((a, b) => a - b);
    const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 60000;
    sessionDurations.push(Math.min(duration, 180)); // cap at 3 hours
  });
  const avgSessionTime = sessionDurations.length > 0
    ? (sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length).toFixed(0)
    : "0";

  // Daily signups (30 days)
  const dailySignups = Array.from({ length: 30 }, (_, i) => {
    const date = daysAgo(29 - i);
    const dateStr = date.toISOString().slice(0, 10);
    const count = profiles.filter(p => p.created_at.slice(0, 10) === dateStr).length;
    return { date: date.toLocaleDateString("en", { month: "short", day: "numeric" }), signups: count };
  });
  const totalSignups30d = dailySignups.reduce((s, d) => s + d.signups, 0);

  const chartConfig = {
    dau: { label: "DAU", color: "hsl(var(--primary))" },
    count: { label: "Count", color: "hsl(var(--primary))" },
    signups: { label: "Signups", color: "hsl(var(--primary))" },
  };

  const exportActivity = () => {
    const headers = ["Feature", "Count"];
    const rows = Object.entries(featureUsage).sort((a, b) => b[1] - a[1]).map(([f, c]) => [f, c]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "analytics.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Avg DAU", value: avgDAU, icon: Users },
          { label: "Avg Session", value: `${avgSessionTime} min`, icon: Timer },
          { label: "Signups (30d)", value: totalSignups30d.toString(), icon: Activity },
          { label: "Total Actions", value: activityLogs.length.toLocaleString(), icon: BarChart3 },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Most Used Features */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-foreground">Most Used Features</h3>
          <Button variant="ghost" size="sm" onClick={exportActivity}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </div>
        {featureChartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={featureChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-8">No activity data yet</p>
        )}
      </div>

      {/* DAU Graph */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Daily Active Users (30 days)</h3>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={dauData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="dau" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Daily Signups */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Daily Signups (30 days)</h3>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={dailySignups}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="date" tick={{ fontSize: 8 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Peak Hours */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Peak Usage Hours
          </h3>
          <div className="grid grid-cols-6 gap-1">
            {hourCounts.map(h => {
              const max = Math.max(...hourCounts.map(x => x.count), 1);
              const intensity = h.count / max;
              return (
                <div key={h.hour} className="rounded p-1.5 text-center text-[10px]"
                  style={{ backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.8})` }}
                  title={`${h.hour}: ${h.count} actions`}>
                  <span className="text-foreground font-mono">{h.hour.split(":")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4" /> Device Breakdown
          </h3>
          <div className="space-y-3">
            {(["desktop", "mobile", "tablet"] as const).map(d => (
              <div key={d} className="flex items-center gap-3">
                {d === "desktop" ? <Monitor className="w-4 h-4 text-muted-foreground" /> : <Smartphone className="w-4 h-4 text-muted-foreground" />}
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground capitalize">{d}</span>
                    <span className="text-muted-foreground font-mono">{((deviceCounts[d] / totalDevices) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(deviceCounts[d] / totalDevices) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
