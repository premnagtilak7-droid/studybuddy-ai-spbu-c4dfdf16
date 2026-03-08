import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function WeeklyStudyChart() {
  const [logs, setLogs] = useState<{ logged_at: string; duration_minutes: number }[]>([]);

  useEffect(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    supabase
      .from("study_logs")
      .select("logged_at, duration_minutes")
      .gte("logged_at", start.toISOString())
      .then(({ data }) => setLogs(data || []));
  }, []);

  const chartData = useMemo(() => {
    const today = new Date();
    const days: { label: string; date: string; hours: number; isToday: boolean }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

      const mins = logs
        .filter((l) => l.logged_at.slice(0, 10) === dateStr)
        .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

      days.push({ label: dayLabel, date: dateStr, hours: +(mins / 60).toFixed(1), isToday: i === 0 });
    }
    return days;
  }, [logs]);

  const totalWeek = chartData.reduce((s, d) => s + d.hours, 0);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Weekly Study Hours
        </h3>
        <span className="text-xs font-mono text-muted-foreground">{totalWeek.toFixed(1)}h total</span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} barCategoryGap="25%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis hide />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}h`, "Studied"]}
          />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.date}
                fill={entry.isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
