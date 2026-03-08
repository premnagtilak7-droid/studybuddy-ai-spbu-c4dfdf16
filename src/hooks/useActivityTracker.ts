import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const featureMap: Record<string, string> = {
  "/": "dashboard",
  "/timetable": "timetable",
  "/subjects": "subjects",
  "/subject-management": "subject_management",
  "/ai-solver": "ai_solver",
  "/study-plan": "study_plan",
  "/study-room": "study_room",
  "/exam-dates": "exam_dates",
  "/admin": "admin",
};

function getDeviceType(): string {
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

export function useActivityTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (!user) return;
    const path = location.pathname;
    // Avoid duplicate logs for same path
    if (path === lastPath.current) return;
    lastPath.current = path;

    const feature = featureMap[path] || (path.startsWith("/subject/") ? "subject_detail" : "unknown");

    supabase.from("activity_logs").insert([{
      user_id: user.id,
      feature,
      action: "page_view",
      device_type: getDeviceType(),
      metadata: { path } as any,
    }]).then(() => {});
  }, [location.pathname, user]);
}

export async function trackAction(userId: string, feature: string, action: string, metadata: Record<string, unknown> = {}) {
  await supabase.from("activity_logs").insert([{
    user_id: userId,
    feature,
    action,
    device_type: getDeviceType(),
    metadata: metadata as any,
  }]);
}
