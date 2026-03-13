import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, UserPlus, UserMinus, BookOpen, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { GroupNotification } from "./types";

const ICON_MAP: Record<string, React.ReactNode> = {
  join: <UserPlus className="w-3.5 h-3.5 text-green-500" />,
  leave: <UserMinus className="w-3.5 h-3.5 text-red-500" />,
  topic: <BookOpen className="w-3.5 h-3.5 text-blue-500" />,
  achievement: <Trophy className="w-3.5 h-3.5 text-yellow-500" />,
  info: <Bell className="w-3.5 h-3.5 text-muted-foreground" />,
};

export default function GroupNotifications({ groupId }: { groupId: string }) {
  const [notifications, setNotifications] = useState<GroupNotification[]>([]);

  useEffect(() => {
    loadNotifications();
    const ch = supabase.channel(`gn-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_notifications", filter: `group_id=eq.${groupId}` }, () => loadNotifications())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId]);

  async function loadNotifications() {
    const { data } = await supabase.from("group_notifications").select("*").eq("group_id", groupId).order("created_at", { ascending: false }).limit(50);
    setNotifications((data || []) as GroupNotification[]);
  }

  if (!notifications.length) return <p className="text-xs text-muted-foreground text-center py-8">No notifications yet</p>;

  return (
    <ScrollArea className="h-72">
      <div className="space-y-2 p-1">
        {notifications.map(n => (
          <div key={n.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30">
            <div className="mt-0.5">{ICON_MAP[n.type] || ICON_MAP.info}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{n.message}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">{n.type}</Badge>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
