import { useMemo, forwardRef } from "react";
import { getStudyDates, getStudyStreak } from "@/lib/study-tracker";

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
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

const StudyHeatmap = forwardRef<HTMLDivElement>((_props, ref) => {
  const studyDatesSet = useMemo(() => new Set(getStudyDates()), []);
  const streak = getStudyStreak();

  // Build 365 days of real data from localStorage
  const data = useMemo(() => {
    const result: { date: string; active: number }[] = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      result.push({ date: dateStr, active: studyDatesSet.has(dateStr) ? 3 : 0 });
    }
    return result;
  }, [studyDatesSet]);

  const weeks: { date: string; active: number }[][] = [];
  let currentWeek: { date: string; active: number }[] = [];

  const firstDay = new Date(data[0].date).getDay();
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({ date: "", active: -1 });
  }

  data.forEach((d) => {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const activeDays = data.filter(d => d.active > 0).length;

  return (
    <div ref={ref} className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Study Consistency</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {activeDays} active days · {streak > 0 ? `${streak} day streak 🔥` : "No streak yet"}
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
                    day.active < 0 ? "bg-transparent" : levelColors[getLevel(day.active)]
                  }`}
                  title={day.date ? `${day.date}: ${day.active > 0 ? "Studied" : "No activity"}` : ""}
                />
              ))}
            </div>
          ))}
        </div>
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
});

StudyHeatmap.displayName = "StudyHeatmap";
export default StudyHeatmap;
