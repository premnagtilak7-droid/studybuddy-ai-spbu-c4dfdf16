import { cn } from "@/lib/utils";

interface CircularProgressProps {
  segments: { filled: boolean; color?: string }[];
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export default function CircularProgress({
  segments,
  size = 80,
  strokeWidth = 6,
  className,
  label,
}: CircularProgressProps) {
  const total = segments.length;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 4; // gap in degrees between segments
  const segmentAngle = (360 - gap * total) / total;
  const center = size / 2;

  const filledCount = segments.filter((s) => s.filled).length;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const startAngle = i * (segmentAngle + gap) - 90;
          const endAngle = startAngle + segmentAngle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);

          const largeArc = segmentAngle > 180 ? 1 : 0;

          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.filled ? "hsl(var(--primary))" : "hsl(var(--secondary))"}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-colors duration-300"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold font-mono text-foreground">
          {filledCount}/{total}
        </span>
        {label && <span className="text-[9px] text-muted-foreground font-mono">{label}</span>}
      </div>
    </div>
  );
}
