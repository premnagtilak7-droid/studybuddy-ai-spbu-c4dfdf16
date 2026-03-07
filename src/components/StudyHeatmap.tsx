import { useMemo } from "react";

// Generate mock heatmap data for the last 365 days
function generateHeatmapData() {
  const data: { date: string; hours: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    // Random study hours 0-6 with some patterns
    const dayOfWeek = d.getDay();
    const base = dayOfWeek === 0 ? 1 : dayOfWeek === 6 ? 2 : 3;
    const hours = Math.max(0, Math.floor(Math.random() * (base + 3)));
    data.push({ date: dateStr, hours });
  }
  return data;
}

function getLevel(hours: number): number {
  if (hours === 0) return 0;
  if (hours <= 1) return 1;
  if (hours <= 3) return 2;
  if (hours <= 5) return 3;
  return 4;
}

const levelColors = [
  "bg-heatmap-0",
  "bg-heatmap-1",
  "bg-heatmap-2",
  "bg-heatmap-3",
  "bg-heatmap-4",
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function StudyHeatmap() {
  const data = useMemo(generateHeatmapData, []);

  // Group by weeks
  const weeks: { date: string; hours: number }[][] = [];
  let currentWeek: { date: string; hours: number }[] = [];

  // Pad the first week
  const firstDay = new Date(data[0].date).getDay();
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({ date: "", hours: -1 });
  }

  data.forEach((d) => {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalHours = data.reduce((s, d) => s + d.hours, 0);
  const streak = (() => {
    let count = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].hours > 0) count++;
      else break;
    }
    return count;
  })();

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Study Consistency</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {totalHours} hours total · {streak} day streak 🔥
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
          <span>Less</span>
          {levelColors.map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-[720px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm transition-colors ${
                    day.hours < 0 ? "bg-transparent" : levelColors[getLevel(day.hours)]
                  }`}
                  title={day.date ? `${day.date}: ${day.hours}h` : ""}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Month labels */}
        <div className="flex mt-1 min-w-[720px]">
          {months.map((m, i) => (
            <span key={i} className="text-[10px] text-muted-foreground font-mono" style={{ width: `${100 / 12}%` }}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
