import { forwardRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { UserSubject } from "@/lib/subjects-store";

const chartColors = [
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(280, 67%, 60%)",
  "hsl(350, 80%, 60%)",
];

const SubjectChart = forwardRef<HTMLDivElement, { subjects: UserSubject[] }>(({ subjects }, ref) => {
  const chartData = subjects.map((s) => ({
    name: s.code,
    units: s.completed_units,
    target: s.target_units,
  }));

  if (chartData.length === 0) {
    return (
      <div ref={ref} className="glass-card p-5 flex items-center justify-center h-[300px]">
        <p className="text-muted-foreground text-sm">Add subjects to see charts</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="glass-card p-5">
      <h3 className="font-semibold text-foreground mb-1">Subject Progress</h3>
      <p className="text-xs text-muted-foreground font-mono mb-4">Units completed per subject</p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barSize={32} margin={{ left: -10 }}>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fontFamily: "JetBrains Mono" }}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
          <Tooltip
            contentStyle={{
              background: "hsl(222, 20%, 12%)",
              border: "1px solid hsl(220, 20%, 18%)",
              borderRadius: "8px",
              fontSize: "12px",
              fontFamily: "JetBrains Mono",
            }}
            labelStyle={{ color: "hsl(220, 14%, 92%)" }}
            itemStyle={{ color: "hsl(220, 14%, 80%)" }}
          />
          <Bar dataKey="units" name="Completed" radius={[6, 6, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={chartColors[i % chartColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

SubjectChart.displayName = "SubjectChart";
export default SubjectChart;
