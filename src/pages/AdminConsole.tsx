import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Shield, CreditCard, Activity, BarChart3, Bell, MessageSquare,
  Brain, FileText, TrendingUp, IndianRupee,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminCouponManager from "@/components/admin/AdminCouponManager";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminFeedback from "@/components/admin/AdminFeedback";
import AdminAIStats from "@/components/admin/AdminAIStats";
import AdminReports from "@/components/admin/AdminReports";
import AdminRevenue from "@/components/admin/AdminRevenue";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

const TABS = [
  { key: "users", label: "Users", icon: Users },
  { key: "coupons", label: "Coupons", icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "feedback", label: "Feedback", icon: MessageSquare },
  { key: "revenue", label: "Revenue", icon: IndianRupee },
  { key: "ai", label: "AI Stats", icon: Brain },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "reports", label: "Reports", icon: FileText },
] as const;

type Tab = typeof TABS[number]["key"];

export default function AdminConsole() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [studyLogs, setStudyLogs] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [doubts, setDoubts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [studyPlansCount, setStudyPlansCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: profileData },
      { data: couponData },
      { data: redemptionData },
      { data: logData },
      { data: topicData },
      { data: doubtData },
      { data: actData },
      { data: subjectData },
      { count: planCount },
      { data: notifData },
      { data: ticketData },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("coupon_redemptions").select("*"),
      supabase.from("study_logs").select("*"),
      supabase.from("topics").select("*"),
      supabase.from("doubt_history").select("*").order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("study_plans").select("*", { count: "exact", head: true }),
      supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
    ]);
    if (profileData) setProfiles(profileData);
    if (couponData) setCoupons(couponData);
    if (redemptionData) setRedemptions(redemptionData);
    if (logData) setStudyLogs(logData);
    if (topicData) setTopics(topicData);
    if (doubtData) setDoubts(doubtData);
    if (actData) setActivityLogs(actData);
    if (subjectData) setSubjects(subjectData);
    setStudyPlansCount(planCount ?? 0);
    if (notifData) setNotifications(notifData);
    if (ticketData) setTickets(ticketData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build user stats
  const now = new Date();
  const userStats = profiles.map((p: any) => {
    const userLogs = studyLogs.filter((l: any) => l.user_id === p.user_id);
    const userDoubts = doubts.filter((d: any) => d.user_id === p.user_id);
    const userSubjects = subjects.filter((s: any) => s.user_id === p.user_id);
    const totalMins = userLogs.reduce((a: number, l: any) => a + l.duration_minutes, 0);
    const lastLog = userLogs.sort((a: any, b: any) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0];
    const logDates = [...new Set(userLogs.map((l: any) => l.logged_at.slice(0, 10)))].sort().reverse();
    let streak = 0;
    for (let i = 0; i < logDates.length; i++) {
      const expected = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (logDates[i] === expected || (i === 0 && logDates[i] === new Date(now.getTime() - 86400000).toISOString().slice(0, 10))) {
        streak++;
      } else break;
    }
    // Count topics completed for this user's subjects
    const userSubjectIds = userSubjects.map((s: any) => s.id);
    const userTopics = topics.filter((t: any) => {
      // We'd need units to map, simplified: count all completed topics
      return t.is_completed;
    });
    return {
      ...p,
      subjectCount: userSubjects.length,
      totalHours: (totalMins / 60).toFixed(1),
      doubtCount: userDoubts.length,
      streak,
      lastStudy: lastLog ? new Date(lastLog.logged_at).toLocaleDateString() : "Never",
      topicsCompleted: 0, // Simplified
    };
  });

  const subscribers = profiles.filter((p: any) => p.is_subscribed);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Loading admin data...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {profiles.length} users · {subscribers.length} premium · {tickets.filter((t: any) => t.status === "open").length} open tickets
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap bg-secondary/50 p-1 rounded-xl">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.key === "feedback" && tickets.filter((tk: any) => tk.status === "open").length > 0 && (
                <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
                  {tickets.filter((tk: any) => tk.status === "open").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "users" && (
          <AdminUserManagement
            profiles={profiles}
            userStats={userStats}
            onRefresh={loadData}
            subjects={subjects}
            studyLogs={studyLogs}
            doubts={doubts}
          />
        )}
        {tab === "coupons" && (
          <AdminCouponManager coupons={coupons} redemptions={redemptions} profiles={profiles} onRefresh={loadData} />
        )}
        {tab === "notifications" && (
          <AdminNotifications notifications={notifications} onRefresh={loadData} />
        )}
        {tab === "feedback" && (
          <AdminFeedback tickets={tickets} onRefresh={loadData} />
        )}
        {tab === "revenue" && (
          <AdminRevenue profiles={profiles} />
        )}
        {tab === "ai" && (
          <AdminAIStats doubts={doubts} subjects={subjects} studyPlansCount={studyPlansCount} />
        )}
        {tab === "analytics" && (
          <AdminAnalytics activityLogs={activityLogs} />
        )}
        {tab === "reports" && (
          <AdminReports profiles={profiles} studyLogs={studyLogs} doubts={doubts} activityLogs={activityLogs} />
        )}
      </div>
    </AppLayout>
  );
}
