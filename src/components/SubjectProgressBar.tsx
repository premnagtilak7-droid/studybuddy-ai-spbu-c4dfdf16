import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SubjectProgressBarProps {
  done: number;
  total: number;
  className?: string;
  showLabel?: boolean;
}

export default function SubjectProgressBar({ done, total, className, showLabel = true }: SubjectProgressBarProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const colorClass =
    percent <= 30
      ? "[&>div]:bg-destructive"
      : percent <= 70
        ? "[&>div]:bg-accent"
        : "[&>div]:bg-[hsl(var(--success))]";

  return (
    <div className={cn("space-y-1", className)}>
      <Progress value={percent} className={cn("h-2", colorClass)} />
      {showLabel && (
        <p className="text-[10px] font-mono text-muted-foreground text-right">{percent}%</p>
      )}
    </div>
  );
}
