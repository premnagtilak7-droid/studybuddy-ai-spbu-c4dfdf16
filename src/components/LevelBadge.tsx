import { getLevel, getLevelProgress, getNextLevel } from "@/lib/xp-store";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LevelBadgeProps {
  xp: number;
  compact?: boolean;
}

export default function LevelBadge({ xp, compact = false }: LevelBadgeProps) {
  const level = getLevel(xp);
  const next = getNextLevel(xp);
  const progress = getLevelProgress(xp);

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {level.emoji} {level.name}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{xp} XP · {level.name}</p>
          {next && <p className="text-[10px] text-muted-foreground">{next.minXP - xp} XP to {next.name}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          {level.emoji} {level.name}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{xp} XP</span>
      </div>
      {next && (
        <>
          <Progress value={progress} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-right">{next.minXP - xp} XP to {next.emoji} {next.name}</p>
        </>
      )}
    </div>
  );
}
