import { useState, useMemo } from "react";
import { Bell, CalendarClock, Flame, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStudyStreak } from "@/lib/study-tracker";
import { getNextExam, type ExamDate } from "@/lib/exam-store";

interface Notification {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  type: "warning" | "info" | "streak";
}

interface NotificationBellProps {
  examDates?: ExamDate[];
}

export default function NotificationBell({ examDates = [] }: NotificationBellProps) {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const streak = getStudyStreak();
  const nextExam = getNextExam(examDates);

  const notifications = useMemo(() => {
    const items: Notification[] = [];

    if (nextExam) {
      if (nextExam.daysLeft <= 3) {
        items.push({
          id: "exam-urgent",
          icon: AlertTriangle,
          title: "Exam in " + nextExam.daysLeft + " day" + (nextExam.daysLeft !== 1 ? "s" : "") + "!",
          description: `${nextExam.exam.label} is coming up. Focus on revision!`,
          type: "warning",
        });
      } else if (nextExam.daysLeft <= 7) {
        items.push({
          id: "exam-soon",
          icon: CalendarClock,
          title: `${nextExam.exam.label} in ${nextExam.daysLeft} days`,
          description: "Revision mode is active. Prioritize high-weightage topics.",
          type: "info",
        });
      } else if (nextExam.daysLeft <= 30) {
        items.push({
          id: "exam-month",
          icon: CalendarClock,
          title: `${nextExam.exam.label} in ${nextExam.daysLeft} days`,
          description: "Stay consistent with your study plan.",
          type: "info",
        });
      }
    }

    if (streak === 0) {
      items.push({
        id: "streak-lost",
        icon: Flame,
        title: "Streak lost!",
        description: "Complete a topic today to start a new streak.",
        type: "warning",
      });
    } else if (streak >= 7) {
      items.push({
        id: "streak-great",
        icon: Flame,
        title: `${streak}-day streak! 🔥`,
        description: "Amazing consistency. Keep it going!",
        type: "streak",
      });
    }

    return items;
  }, [nextExam, streak]);

  const unreadCount = notifications.filter((n) => !seen.has(n.id)).length;

  const handleOpen = (open: boolean) => {
    if (open) {
      setSeen(new Set(notifications.map((n) => n.id)));
    }
  };

  const typeStyles: Record<string, string> = {
    warning: "bg-destructive/10 text-destructive",
    info: "bg-primary/10 text-primary",
    streak: "bg-accent/10 text-accent",
  };

  return (
    <DropdownMenu onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
        </div>
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All clear! No alerts.</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                <div className={`p-1.5 rounded-lg flex-shrink-0 ${typeStyles[n.type]}`}>
                  <n.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
