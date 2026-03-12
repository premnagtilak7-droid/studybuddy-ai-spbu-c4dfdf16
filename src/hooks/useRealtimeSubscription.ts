import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type TableName = "subjects" | "units" | "topics" | "subtopics" | "study_logs" | "timer_sessions" | "study_dates" | "timetable_sessions" | "exam_dates";

/**
 * Subscribe to realtime changes on a table. Calls `onUpdate` whenever
 * any INSERT / UPDATE / DELETE happens on the given table.
 */
export function useRealtimeSubscription(
  table: TableName,
  onUpdate: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`realtime_${table}_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate, enabled]);
}

/**
 * Subscribe to multiple tables at once
 */
export function useMultiRealtimeSubscription(
  tables: TableName[],
  onUpdate: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(`realtime_multi_${Math.random().toString(36).slice(2)}`);
    
    tables.forEach(table => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => onUpdate()
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(","), onUpdate, enabled]);
}
