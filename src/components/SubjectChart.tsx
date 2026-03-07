import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const subjectData = [
  { name: "BEE", hours: 42, mastery: 78 },
  { name: "Mechanics", hours: 35, mastery: 65 },
  { name: "Maths II", hours: 50, mastery: 82 },
  { name: "Chemistry", hours: 28, mastery: 55 },
  { name: "Workshop", hours: 15, mastery: 90 },
];

const chartColors = [
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)",
  "hsl(280, 67%, 60%)",
  "hsl(350, 80%, 60%)",
];

export default function SubjectChart() {
  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold text-foreground mb-1">Subject-wise Mastery</h3>
      <p className="text-xs text-muted-foreground font-mono mb-4">Hours studied & mastery %</p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={subjectData} barSize={32} margin={{ left: -10 }}>
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
            formatter={(value: number, name: string) => [
              name === "hours" ? `${value}h` : `${value}%`,
              name === "hours" ? "Study Hours" : "Mastery",
            ]}
          />
          <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
            {subjectData.map((_, i) => (
              <Cell key={i} fill={chartColors[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
