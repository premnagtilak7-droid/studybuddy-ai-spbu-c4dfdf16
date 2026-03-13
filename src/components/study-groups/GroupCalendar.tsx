import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { MemberWithStats, GroupAssignment } from "./types";

interface Props {
  groupId: string;
  members: MemberWithStats[];
}

type CalendarEvent = { date: string; type: "study" | "assignment"; label: string; user?: string; color: string };

export default function GroupCalendar({ groupId, members }: Props) {
  const [month, setMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => { loadEvents(); }, [groupId, month]);

  async function loadEvents() {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const userIds = members.map(m => m.user_id);

    const [logsRes, assignRes, remindersRes] = await Promise.all([
      supabase.from("study_logs").select("user_id, logged_at, duration_minutes").in("user_id", userIds.length ? userIds : ["none"]).gte("logged_at", start).lte("logged_at", end),
      supabase.from("group_assignments").select("*").eq("group_id", groupId),
      supabase.from("study_reminders").select("user_id, subject_name, reminder_time").in("user_id", userIds.length ? userIds : ["none"]).eq("is_active", true),
    ]);

    const evts: CalendarEvent[] = [];
    (logsRes.data || []).forEach(l => {
      const m = members.find(m => m.user_id === l.user_id);
      evts.push({ date: l.logged_at.split("T")[0], type: "study", label: `${m?.display_name || m?.email || "User"}: ${l.duration_minutes}min`, color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" });
    });
    ((assignRes.data || []) as any[]).forEach(a => {
      if (a.deadline) {
        evts.push({ date: a.deadline.split("T")[0], type: "assignment", label: `📋 ${a.title}`, color: "bg-orange-500/20 text-orange-700 dark:text-orange-300" });
      }
    });
    setEvents(evts);
  }

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const today = new Date().toISOString().split("T")[0];

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(e => { (map[e.date] ||= []).push(e); });
    return map;
  }, [events]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))}><ChevronLeft className="w-4 h-4" /></Button>
        <p className="text-sm font-medium text-foreground">{month.toLocaleString("default", { month: "long", year: "numeric" })}</p>
        <Button variant="ghost" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {blanks.map(b => <div key={`b${b}`} />)}
        {days.map(d => {
          const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === today;
          return (
            <div key={d} className={`relative p-1 min-h-[2.5rem] rounded text-xs ${isToday ? "ring-1 ring-primary" : ""} ${dayEvents.length ? "bg-secondary/40" : ""}`}>
              <span className={`text-[10px] ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>{d}</span>
              {dayEvents.length > 0 && (
                <div className="absolute bottom-0.5 left-0.5 right-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${e.type === "study" ? "bg-blue-500" : "bg-orange-500"}`} title={e.label} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" />Study sessions</span>
        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" />Assignments</span>
      </div>
    </div>
  );
}
