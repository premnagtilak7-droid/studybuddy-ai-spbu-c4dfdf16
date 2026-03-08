import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Ticket, Plus, Trash2, ToggleLeft, ToggleRight, Shield, Copy,
  TrendingUp, CreditCard, Activity, BarChart3, Download, Bell, Ban,
  ChevronDown, ChevronUp, X, Search, Calendar, Clock, Smartphone, Monitor,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

type Profile = {
  user_id: string;
  email: string;
  display_name: string | null;
  is_subscribed: boolean;
  created_at: string;
};

type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  created_at: string;
};

type StudyLogRow = { user_id: string; duration_minutes: number; logged_at: string; subject_id: string | null };
type TopicRow = { id: string; is_completed: boolean; completed_at: string | null; unit_id: string };
type DoubtRow = { id: string; user_id: string; question: string; created_at: string };
type ActivityRow = { id: string; user_id: string; feature: string; action: string; device_type: string; created_at: string; metadata: Record<string, unknown> };
type SubjectRow = { id: string; user_id: string; name: string; completed_units: number; target_units: number };

const TABS = [
  { key: "users", label: "Users & Growth", icon: Users },
  { key: "revenue", label: "Subscriptions", icon: CreditCard },
  { key: "activity", label: "Study Activity", icon: Activity },
  { key: "analytics", label: "App Analytics", icon: BarChart3 },
  { key: "controls", label: "Admin Controls", icon: Shield },
] as const;

type Tab = typeof TABS[number]["key"];

export default function AdminConsole() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [studyLogs, setStudyLogs] = useState<StudyLogRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [doubts, setDoubts] = useState<DoubtRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [studyPlansCount, setStudyPlansCount] = useState(0);
  const [tab, setTab] = useState<Tab>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Coupon form
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(100);
  const [newMaxUses, setNewMaxUses] = useState<number | "">("");

  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMsg, setAnnouncementMsg] = useState("");

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      { data: profileData },
      { data: couponData },
      { data: logData },
      { data: topicData },
      { data: doubtData },
      { data: actData },
      { data: subjectData },
      { count: planCount },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("study_logs").select("*"),
      supabase.from("topics").select("*"),
      supabase.from("doubt_history").select("*"),
      supabase.from("activity_logs").select("*"),
      supabase.from("subjects").select("*"),
      supabase.from("study_plans").select("*", { count: "exact", head: true }),
    ]);
    if (profileData) setProfiles(profileData);
    if (couponData) setCoupons(couponData);
    if (logData) setStudyLogs(logData as StudyLogRow[]);
    if (topicData) setTopics(topicData as TopicRow[]);
    if (doubtData) setDoubts(doubtData as DoubtRow[]);
    if (actData) setActivityLogs(actData as ActivityRow[]);
    if (subjectData) setSubjects(subjectData as SubjectRow[]);
    setStudyPlansCount(planCount ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Helpers
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const isThisWeek = (date: string) => new Date(date) >= daysAgo(7);
  const isThisMonth = (date: string) => new Date(date) >= daysAgo(30);

  const filteredUsers = profiles.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ===== SECTION 1: Users & Growth =====
  const usersThisWeek = profiles.filter(u => isThisWeek(u.created_at)).length;
  const usersThisMonth = profiles.filter(u => isThisMonth(u.created_at)).length;

  const userGrowthData = Array.from({ length: 30 }, (_, i) => {
    const date = daysAgo(29 - i);
    const dateStr = date.toISOString().slice(0, 10);
    const count = profiles.filter(u => u.created_at.slice(0, 10) <= dateStr).length;
    return { date: date.toLocaleDateString("en", { month: "short", day: "numeric" }), users: count };
  });

  // ===== SECTION 2: Revenue =====
  const subscribers = profiles.filter(u => u.is_subscribed);
  const subsThisWeek = subscribers.filter(u => isThisWeek(u.created_at)).length;
  const subsThisMonth = subscribers.filter(u => isThisMonth(u.created_at)).length;

  // ===== SECTION 3: Study Activity =====
  const completedTopics = topics.filter(t => t.is_completed);
  const totalStudyMinutes = studyLogs.reduce((a, l) => a + l.duration_minutes, 0);
  const avgStudyHours = profiles.length > 0 ? (totalStudyMinutes / 60 / profiles.length).toFixed(1) : "0";

  // Most active users by topics completed
  const userTopicCounts: Record<string, number> = {};
  // We need to map topics -> units -> subjects -> user_id
  const unitToSubject: Record<string, string> = {};
  // Build subject user map
  const subjectUserMap: Record<string, string> = {};
  subjects.forEach(s => { subjectUserMap[s.id] = s.user_id; });

  // Per-user stats table
  const userStats = profiles.map(p => {
    const userSubjects = subjects.filter(s => s.user_id === p.user_id);
    const userLogs = studyLogs.filter(l => l.user_id === p.user_id);
    const userDoubts = doubts.filter(d => d.user_id === p.user_id);
    const totalMins = userLogs.reduce((a, l) => a + l.duration_minutes, 0);
    const lastLog = userLogs.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0];
    // Streak calculation (simplified)
    const logDates = [...new Set(userLogs.map(l => l.logged_at.slice(0, 10)))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < logDates.length; i++) {
      const expected = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      if (logDates[i] === expected || (i === 0 && logDates[i] === new Date(now.getTime() - 86400000).toISOString().slice(0, 10))) {
        streak++;
      } else break;
    }
    return {
      ...p,
      subjectCount: userSubjects.length,
      totalHours: (totalMins / 60).toFixed(1),
      doubtCount: userDoubts.length,
      streak,
      lastStudy: lastLog ? new Date(lastLog.logged_at).toLocaleDateString() : "Never",
    };
  });

  // ===== SECTION 4: Analytics =====
  const featureUsage: Record<string, number> = {};
  activityLogs.forEach(a => {
    const f = a.feature;
    featureUsage[f] = (featureUsage[f] || 0) + 1;
  });
  const featureChartData = Object.entries(featureUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.replace(/_/g, " "), count }));

  // DAU last 30 days
  const dauData = Array.from({ length: 30 }, (_, i) => {
    const date = daysAgo(29 - i);
    const dateStr = date.toISOString().slice(0, 10);
    const uniqueUsers = new Set(activityLogs.filter(a => a.created_at.slice(0, 10) === dateStr).map(a => a.user_id));
    return { date: date.toLocaleDateString("en", { month: "short", day: "numeric" }), dau: uniqueUsers.size };
  });

  // Peak hours
  const hourCounts = Array.from({ length: 24 }, (_, h) => {
    const count = activityLogs.filter(a => new Date(a.created_at).getHours() === h).length;
    return { hour: `${h}:00`, count };
  });

  // Device breakdown
  const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };
  activityLogs.forEach(a => {
    const d = (a.device_type || "desktop") as keyof typeof deviceCounts;
    if (d in deviceCounts) deviceCounts[d]++;
  });
  const totalDevices = Object.values(deviceCounts).reduce((a, b) => a + b, 0) || 1;

  // Most searched in AI solver
  const aiQueries = doubts.map(d => d.question).slice(0, 10);

  // ===== ACTIONS =====
  const createCoupon = async () => {
    if (!newCode.trim()) return toast.error("Enter a coupon code");
    const { error } = await supabase.from("coupons").insert({
      code: newCode.toUpperCase().trim(),
      discount_percent: newDiscount,
      max_uses: newMaxUses || null,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Coupon ${newCode.toUpperCase()} created!`);
    setNewCode("");
    setNewMaxUses("");
    loadData();
  };

  const toggleCoupon = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    loadData();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Coupon deleted");
    loadData();
  };

  const toggleSubscription = async (userId: string, current: boolean) => {
    await supabase.from("profiles").update({ is_subscribed: !current }).eq("user_id", userId);
    toast.success(`Subscription ${!current ? "granted" : "revoked"}`);
    loadData();
  };

  const sendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMsg.trim()) return toast.error("Fill both fields");
    const { error } = await supabase.from("announcements").insert({
      title: announcementTitle.trim(),
      message: announcementMsg.trim(),
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Announcement sent to all users!");
    setAnnouncementTitle("");
    setAnnouncementMsg("");
  };

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data.length) return toast.error("No data to export");
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const StatCard = ({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) => (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </div>
    </div>
  );

  const chartConfig = {
    users: { label: "Users", color: "hsl(var(--primary))" },
    dau: { label: "DAU", color: "hsl(var(--primary))" },
    count: { label: "Count", color: "hsl(var(--accent))" },
  };

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
              <p className="text-sm text-muted-foreground">{profiles.length} users · {subscribers.length} premium</p>
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
            </button>
          ))}
        </div>

        {/* ===== TAB: Users & Growth ===== */}
        {tab === "users" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Total Users" value={profiles.length} />
              <StatCard icon={TrendingUp} label="New This Week" value={usersThisWeek} />
              <StatCard icon={Calendar} label="New This Month" value={usersThisMonth} />
              <StatCard icon={CreditCard} label="Premium Users" value={subscribers.length} />
            </div>

            {/* Growth Chart */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">User Growth (30 days)</h3>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>

            {/* User Table */}
            <div className="glass-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="border-0 bg-transparent h-8 text-sm focus-visible:ring-0"
                />
                <Button variant="ghost" size="sm" onClick={() => exportCSV(profiles as any[], "users")}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => setSelectedUser(u.user_id)}>
                        <td className="p-3 font-mono text-muted-foreground text-xs">{i + 1}</td>
                        <td className="p-3 font-medium text-foreground text-xs">{u.display_name || "—"}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_subscribed ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {u.is_subscribed ? "PRO" : "FREE"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); toggleSubscription(u.user_id, u.is_subscribed); }}>
                            {u.is_subscribed ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>}
            </div>

            {/* User Detail Modal */}
            <AnimatePresence>
              {selectedUser && (() => {
                const u = userStats.find(us => us.user_id === selectedUser);
                if (!u) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedUser(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.95 }}
                      className="glass-card p-6 max-w-md w-full space-y-4"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-foreground">{u.display_name || "Unnamed"}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                        </div>
                        <button onClick={() => setSelectedUser(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-lg font-bold text-foreground">{u.subjectCount}</p>
                          <p className="text-xs text-muted-foreground">Subjects</p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-lg font-bold text-foreground">{u.totalHours}h</p>
                          <p className="text-xs text-muted-foreground">Study Hours</p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-lg font-bold text-foreground">{u.doubtCount}</p>
                          <p className="text-xs text-muted-foreground">Doubts Asked</p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-lg font-bold text-foreground">{u.streak}🔥</p>
                          <p className="text-xs text-muted-foreground">Study Streak</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                        <p>Last Study: {u.lastStudy}</p>
                        <p>Status: {u.is_subscribed ? "Premium ✨" : "Free"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { toggleSubscription(u.user_id, u.is_subscribed); setSelectedUser(null); }}>
                          {u.is_subscribed ? "Revoke Premium" : "Grant Premium"}
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ===== TAB: Subscriptions & Revenue ===== */}
        {tab === "revenue" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={CreditCard} label="Active Subscribers" value={subscribers.length} />
              <StatCard icon={TrendingUp} label="New This Week" value={subsThisWeek} />
              <StatCard icon={Calendar} label="New This Month" value={subsThisMonth} />
              <StatCard icon={Users} label="Conversion Rate" value={`${profiles.length > 0 ? ((subscribers.length / profiles.length) * 100).toFixed(1) : 0}%`} />
            </div>

            {/* Subscribers List */}
            <div className="glass-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Premium Subscribers</h3>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(subscribers as any[], "subscribers")}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map(u => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="p-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                        <td className="p-3 text-xs text-foreground">{u.display_name || "—"}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => toggleSubscription(u.user_id, true)}>
                            <Ban className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {subscribers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No premium subscribers yet</p>}
            </div>

            {/* Coupon Engine */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Coupon Manager
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="SPPU_PRO" className="font-mono uppercase" />
                </div>
                <div>
                  <Label className="text-xs">Discount %</Label>
                  <Input type="number" value={newDiscount} onChange={e => setNewDiscount(Number(e.target.value))} min={1} max={100} />
                </div>
                <div>
                  <Label className="text-xs">Max Uses</Label>
                  <Input type="number" value={newMaxUses} onChange={e => setNewMaxUses(e.target.value ? Number(e.target.value) : "")} min={1} placeholder="∞" />
                </div>
                <div className="flex items-end">
                  <Button onClick={createCoupon} className="w-full" size="sm"><Plus className="w-4 h-4 mr-1" /> Create</Button>
                </div>
              </div>
              {coupons.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs text-muted-foreground">Code</th>
                        <th className="text-left p-2 text-xs text-muted-foreground">Discount</th>
                        <th className="text-left p-2 text-xs text-muted-foreground">Uses</th>
                        <th className="text-left p-2 text-xs text-muted-foreground">Status</th>
                        <th className="text-left p-2 text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(c => (
                        <tr key={c.id} className="border-b border-border/50">
                          <td className="p-2 font-mono font-bold text-xs text-foreground flex items-center gap-1">
                            {c.code}
                            <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}>
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </td>
                          <td className="p-2 font-mono text-xs">{c.discount_percent}%</td>
                          <td className="p-2 font-mono text-xs text-muted-foreground">{c.used_count}/{c.max_uses ?? "∞"}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${c.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {c.is_active ? "ACTIVE" : "OFF"}
                            </span>
                          </td>
                          <td className="p-2 flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => toggleCoupon(c.id, c.is_active)}>
                              {c.is_active ? <ToggleRight className="w-3.5 h-3.5 text-primary" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteCoupon(c.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== TAB: Study Activity ===== */}
        {tab === "activity" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Activity} label="Avg Study Hours/User" value={avgStudyHours} />
              <StatCard icon={TrendingUp} label="Topics Completed" value={completedTopics.length} />
              <StatCard icon={Users} label="Doubts Asked" value={doubts.length} />
              <StatCard icon={Calendar} label="Study Plans Generated" value={studyPlansCount} />
            </div>

            {/* Per-user activity table */}
            <div className="glass-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Per-User Activity</h3>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(userStats.map(u => ({
                  email: u.email, name: u.display_name, subjects: u.subjectCount,
                  study_hours: u.totalHours, doubts: u.doubtCount, streak: u.streak, last_study: u.lastStudy,
                })), "user-activity")}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">User</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Subjects</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Hours</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Doubts</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Streak</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Last Study</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userStats.sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours)).map(u => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => setSelectedUser(u.user_id)}>
                        <td className="p-3 text-xs">
                          <p className="font-medium text-foreground">{u.display_name || "—"}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{u.email}</p>
                        </td>
                        <td className="p-3 font-mono text-xs text-foreground">{u.subjectCount}</td>
                        <td className="p-3 font-mono text-xs text-foreground">{u.totalHours}h</td>
                        <td className="p-3 font-mono text-xs text-foreground">{u.doubtCount}</td>
                        <td className="p-3 font-mono text-xs text-foreground">{u.streak}🔥</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{u.lastStudy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== TAB: App Analytics ===== */}
        {tab === "analytics" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Feature Usage */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Most Used Features</h3>
              {featureChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart data={featureChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">No activity data yet</p>
              )}
            </div>

            {/* DAU Chart */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Daily Active Users (30 days)</h3>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart data={dauData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="dau" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Peak Hours */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Peak Usage Hours
                </h3>
                <div className="grid grid-cols-6 gap-1">
                  {hourCounts.map(h => {
                    const max = Math.max(...hourCounts.map(x => x.count), 1);
                    const intensity = h.count / max;
                    return (
                      <div
                        key={h.hour}
                        className="rounded p-1.5 text-center text-[10px]"
                        style={{ backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.8})` }}
                        title={`${h.hour}: ${h.count} actions`}
                      >
                        <span className="text-foreground font-mono">{h.hour.split(":")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" /> Device Breakdown
                </h3>
                <div className="space-y-3">
                  {(["desktop", "mobile", "tablet"] as const).map(d => (
                    <div key={d} className="flex items-center gap-3">
                      {d === "desktop" ? <Monitor className="w-4 h-4 text-muted-foreground" /> : <Smartphone className="w-4 h-4 text-muted-foreground" />}
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground capitalize">{d}</span>
                          <span className="text-muted-foreground font-mono">{((deviceCounts[d] / totalDevices) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(deviceCounts[d] / totalDevices) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent AI Queries */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent AI Doubt Solver Queries</h3>
              {aiQueries.length > 0 ? (
                <div className="space-y-2">
                  {aiQueries.map((q, i) => (
                    <div key={i} className="bg-secondary/50 px-3 py-2 rounded-lg text-xs text-foreground truncate">{q}</div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">No queries yet</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== TAB: Admin Controls ===== */}
        {tab === "controls" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Send Announcement */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" /> Send Announcement
              </h3>
              <Input
                value={announcementTitle}
                onChange={e => setAnnouncementTitle(e.target.value)}
                placeholder="Announcement title..."
              />
              <Textarea
                value={announcementMsg}
                onChange={e => setAnnouncementMsg(e.target.value)}
                placeholder="Write your announcement..."
                rows={3}
              />
              <Button onClick={sendAnnouncement}><Bell className="w-4 h-4 mr-1" /> Send to All Users</Button>
            </div>

            {/* Export All Data */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Data
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => exportCSV(profiles as any[], "all-users")}>Users</Button>
                <Button variant="outline" size="sm" onClick={() => exportCSV(studyLogs as any[], "study-logs")}>Study Logs</Button>
                <Button variant="outline" size="sm" onClick={() => exportCSV(doubts as any[], "doubts")}>Doubts</Button>
                <Button variant="outline" size="sm" onClick={() => exportCSV(activityLogs as any[], "activity-logs")}>Activity</Button>
                <Button variant="outline" size="sm" onClick={() => exportCSV(coupons as any[], "coupons")}>Coupons</Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
