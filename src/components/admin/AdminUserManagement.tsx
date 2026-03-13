import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Download, X, Ban, ShieldCheck, CreditCard, Trash2,
  ToggleLeft, ToggleRight, Key, Calendar, Filter, ChevronDown, Activity,
  Crown, Zap, Clock, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Profile = {
  user_id: string; email: string; display_name: string | null;
  is_subscribed: boolean; is_banned: boolean; ban_reason: string | null;
  premium_expires_at: string | null; created_at: string;
  current_plan: string; plan_expires_at: string | null;
  is_trial_active: boolean | null; trial_start: string | null;
  trial_end: string | null; last_active_at: string | null;
  college: string | null; branch: string | null;
};

type UserStat = Profile & {
  subjectCount: number; totalHours: string; doubtCount: number;
  streak: number; lastStudy: string; topicsCompleted: number;
};

type Props = {
  profiles: Profile[];
  userStats: UserStat[];
  onRefresh: () => void;
  subjects: { id: string; user_id: string; name: string }[];
  studyLogs: { user_id: string; duration_minutes: number; logged_at: string }[];
  doubts: { user_id: string; question: string; created_at: string }[];
  activityLogs?: { user_id: string; feature: string; action: string; created_at: string; device_type: string | null }[];
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary/20 text-primary",
  elite: "bg-amber-500/20 text-amber-600",
};

const PLAN_ICONS: Record<string, typeof Users> = {
  free: Users,
  pro: Zap,
  elite: Crown,
};

function getTrialDaysLeft(trialEnd: string | null): number {
  if (!trialEnd) return 0;
  const diff = new Date(trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getPlanExpiryDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function AdminUserManagement({ profiles, userStats, onRefresh, subjects, studyLogs, doubts, activityLogs = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [planModalUser, setPlanModalUser] = useState<string | null>(null);
  const [planModalTarget, setPlanModalTarget] = useState("pro");
  const [planModalExpiry, setPlanModalExpiry] = useState("");
  const [extendModalUser, setExtendModalUser] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [extendType, setExtendType] = useState<"subscription" | "trial">("subscription");
  const [detailTab, setDetailTab] = useState("stats");

  const filteredUsers = userStats.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const plan = (u as any).current_plan || "free";
    const matchesPlan = filterPlan === "all" || plan === filterPlan;
    const matchesStatus = filterStatus === "all" || (filterStatus === "banned" ? u.is_banned : filterStatus === "trial" ? (u as any).is_trial_active : !u.is_banned);
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const banUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: true, ban_reason: "Banned by admin" } as any).eq("user_id", userId);
    toast.success("User banned");
    onRefresh();
  };

  const unbanUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: false, ban_reason: null } as any).eq("user_id", userId);
    toast.success("User unbanned");
    onRefresh();
  };

  const deleteUser = async (userId: string) => {
    await Promise.all([
      supabase.from("profiles").delete().eq("user_id", userId),
      supabase.from("subjects").delete().eq("user_id", userId),
      supabase.from("study_logs").delete().eq("user_id", userId),
      supabase.from("doubt_history").delete().eq("user_id", userId),
      supabase.from("activity_logs").delete().eq("user_id", userId),
      supabase.from("payments").delete().eq("user_id", userId),
    ]);
    toast.success("User data deleted");
    setDeleteUserId(null);
    onRefresh();
  };

  const changePlan = async (userId: string, plan: string, expiryDate?: string) => {
    const isPaid = plan !== "free";
    await supabase.from("profiles").update({
      current_plan: plan,
      is_subscribed: isPaid,
      plan_expires_at: isPaid && expiryDate ? new Date(expiryDate).toISOString() : isPaid ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
      is_trial_active: false,
    } as any).eq("user_id", userId);
    toast.success(`Plan changed to ${plan.toUpperCase()}`);
    setPlanModalUser(null);
    setPlanModalExpiry("");
    onRefresh();
  };

  const extendPeriod = async (userId: string) => {
    const days = parseInt(extendDays) || 30;
    const user = profiles.find(p => p.user_id === userId);
    if (!user) return;

    if (extendType === "trial") {
      const currentEnd = user.trial_end ? new Date(user.trial_end) : new Date();
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + days * 86400000);
      await supabase.from("profiles").update({
        trial_end: newEnd.toISOString(),
        is_trial_active: true,
      } as any).eq("user_id", userId);
      toast.success(`Trial extended by ${days} days`);
    } else {
      const currentEnd = user.plan_expires_at ? new Date(user.plan_expires_at) : new Date();
      const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + days * 86400000);
      await supabase.from("profiles").update({
        plan_expires_at: newEnd.toISOString(),
      } as any).eq("user_id", userId);
      toast.success(`Subscription extended by ${days} days`);
    }
    setExtendModalUser(null);
    setExtendDays("30");
    onRefresh();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success(`Password reset email sent to ${email}`);
  };

  const exportCSV = () => {
    const headers = ["Email", "Name", "Plan", "Trial", "Status", "Join Date", "Last Active", "Study Hours", "Subjects", "Streak"];
    const rows = filteredUsers.map(u => [
      u.email, u.display_name || "", (u as any).current_plan || "free",
      (u as any).is_trial_active ? `${getTrialDaysLeft((u as any).trial_end)}d left` : "No",
      u.is_banned ? "Banned" : "Active", new Date(u.created_at).toLocaleDateString(),
      (u as any).last_active_at ? new Date((u as any).last_active_at).toLocaleDateString() : "Never",
      u.totalHours, u.subjectCount, u.streak,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const selectedUserData = selectedUser ? userStats.find(u => u.user_id === selectedUser) : null;
  const selectedUserActivities = selectedUser ? activityLogs.filter(a => a.user_id === selectedUser).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Users", value: profiles.length, color: "text-foreground" },
          { label: "Free", value: profiles.filter(p => (p as any).current_plan === "free" || !(p as any).current_plan).length, color: "text-muted-foreground" },
          { label: "Pro", value: profiles.filter(p => (p as any).current_plan === "pro").length, color: "text-primary" },
          { label: "Elite", value: profiles.filter(p => (p as any).current_plan === "elite").length, color: "text-amber-600" },
          { label: "On Trial", value: profiles.filter(p => (p as any).is_trial_active).length, color: "text-blue-500" },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by email or name..." className="border-0 bg-transparent h-8 text-sm focus-visible:ring-0" />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="trial">On Trial</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">#</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">User</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Plan</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Trial</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Joined</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Last Active</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Expiry</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => {
                const plan = (u as any).current_plan || "free";
                const trialActive = (u as any).is_trial_active;
                const trialDays = getTrialDaysLeft((u as any).trial_end);
                const expiryDays = getPlanExpiryDays((u as any).plan_expires_at);
                return (
                  <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                    onClick={() => { setSelectedUser(u.user_id); setDetailTab("stats"); }}>
                    <td className="p-3 font-mono text-muted-foreground text-xs">{i + 1}</td>
                    <td className="p-3">
                      <p className="font-medium text-foreground text-xs">{u.display_name || "—"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PLAN_COLORS[plan] || PLAN_COLORS.free}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      {trialActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-600">
                          {trialDays}d left
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {(u as any).last_active_at ? new Date((u as any).last_active_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {expiryDays !== null ? `${expiryDays}d` : "—"}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_banned ? "bg-destructive/20 text-destructive" : "bg-green-500/20 text-green-600"
                      }`}>{u.is_banned ? "BANNED" : "ACTIVE"}</span>
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setPlanModalUser(u.user_id)} title="Change Plan">
                          <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setExtendModalUser(u.user_id); setExtendType(trialActive ? "trial" : "subscription"); }} title="Extend">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        {u.is_banned ? (
                          <Button variant="ghost" size="sm" onClick={() => unbanUser(u.user_id)} title="Unban">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => banUser(u.user_id)} title="Ban">
                            <Ban className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setDeleteUserId(u.user_id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUserData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    {selectedUserData.display_name || "Unnamed"}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PLAN_COLORS[(selectedUserData as any).current_plan || "free"]}`}>
                      {(selectedUserData as any).current_plan || "free"}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedUserData.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="stats" className="flex-1 text-xs">Stats</TabsTrigger>
                  <TabsTrigger value="subscription" className="flex-1 text-xs">Subscription</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1 text-xs">Activity Log</TabsTrigger>
                </TabsList>

                <TabsContent value="stats" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      { label: "Subjects", value: selectedUserData.subjectCount },
                      { label: "Study Hours", value: `${selectedUserData.totalHours}h` },
                      { label: "Doubts Asked", value: selectedUserData.doubtCount },
                      { label: "Topics Done", value: selectedUserData.topicsCompleted },
                      { label: "Streak", value: `${selectedUserData.streak}🔥` },
                      { label: "College", value: (selectedUserData as any).college || "—" },
                    ].map(s => (
                      <div key={s.label} className="bg-secondary/50 p-3 rounded-lg text-center">
                        <p className="text-lg font-bold text-foreground truncate">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Joined: {new Date(selectedUserData.created_at).toLocaleDateString()}</p>
                    <p>Last Active: {(selectedUserData as any).last_active_at ? new Date((selectedUserData as any).last_active_at).toLocaleString() : "—"}</p>
                    <p>Status: {selectedUserData.is_banned ? "🚫 Banned" : "✅ Active"}</p>
                  </div>
                </TabsContent>

                <TabsContent value="subscription" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Current Plan</p>
                      <p className="font-bold text-foreground uppercase">{(selectedUserData as any).current_plan || "free"}</p>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Trial Status</p>
                      <p className="font-bold text-foreground">
                        {(selectedUserData as any).is_trial_active
                          ? `Active — ${getTrialDaysLeft((selectedUserData as any).trial_end)}d left`
                          : "Expired"}
                      </p>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Plan Expiry</p>
                      <p className="font-bold text-foreground">
                        {(selectedUserData as any).plan_expires_at
                          ? `${new Date((selectedUserData as any).plan_expires_at).toLocaleDateString()} (${getPlanExpiryDays((selectedUserData as any).plan_expires_at)}d)`
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-[10px] text-muted-foreground">Subscribed</p>
                      <p className="font-bold text-foreground">{selectedUserData.is_subscribed ? "Yes ✅" : "No"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPlanModalUser(selectedUserData.user_id)}>
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1" /> Change Plan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setExtendModalUser(selectedUserData.user_id); setExtendType("subscription"); }}>
                      <Clock className="w-3.5 h-3.5 mr-1" /> Extend Subscription
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setExtendModalUser(selectedUserData.user_id); setExtendType("trial"); }}>
                      <Clock className="w-3.5 h-3.5 mr-1" /> Extend Trial
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-2 mt-4">
                  {selectedUserActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity logs found</p>
                  ) : (
                    <div className="max-h-[40vh] overflow-y-auto space-y-1">
                      {selectedUserActivities.map((a, i) => (
                        <div key={i} className="flex items-center justify-between bg-secondary/30 px-3 py-2 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium text-foreground">{a.feature}</span>
                            <span className="text-muted-foreground">— {a.action}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {a.device_type && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{a.device_type}</span>}
                            <span className="font-mono text-[10px]">{new Date(a.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => resetPassword(selectedUserData.email)}>
                  <Key className="w-3.5 h-3.5 mr-1" /> Reset Password
                </Button>
                {selectedUserData.is_banned ? (
                  <Button size="sm" variant="outline" onClick={() => { unbanUser(selectedUserData.user_id); setSelectedUser(null); }}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Unban
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={() => { banUser(selectedUserData.user_id); setSelectedUser(null); }}>
                    <Ban className="w-3.5 h-3.5 mr-1" /> Ban
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => { setDeleteUserId(selectedUserData.user_id); setSelectedUser(null); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Account
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all user data (subjects, study logs, doubts, activity, payments). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUserId && deleteUser(deleteUserId)} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Modal */}
      <AnimatePresence>
        {planModalUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPlanModalUser(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-sm w-full space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-foreground">Change User Plan</h3>
              <p className="text-xs text-muted-foreground">
                {profiles.find(p => p.user_id === planModalUser)?.email}
              </p>
              <div>
                <label className="text-xs text-muted-foreground">Select Plan</label>
                <Select value={planModalTarget} onValueChange={setPlanModalTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro (₹149/mo)</SelectItem>
                    <SelectItem value="elite">Elite (₹299/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {planModalTarget !== "free" && (
                <div>
                  <label className="text-xs text-muted-foreground">Expiry Date (optional, defaults 30 days)</label>
                  <Input type="date" value={planModalExpiry} onChange={e => setPlanModalExpiry(e.target.value)} />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => changePlan(planModalUser, planModalTarget, planModalExpiry || undefined)} className="flex-1">
                  Apply Plan
                </Button>
                <Button variant="outline" onClick={() => setPlanModalUser(null)}>Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extend Subscription/Trial Modal */}
      <AnimatePresence>
        {extendModalUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setExtendModalUser(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-sm w-full space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-foreground">
                Extend {extendType === "trial" ? "Trial" : "Subscription"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {profiles.find(p => p.user_id === extendModalUser)?.email}
              </p>
              <div>
                <label className="text-xs text-muted-foreground">Extend Type</label>
                <Select value={extendType} onValueChange={v => setExtendType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="trial">Trial Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Days to extend</label>
                <Input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)} min={1} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => extendPeriod(extendModalUser)} className="flex-1">
                  Extend {extendDays} Days
                </Button>
                <Button variant="outline" onClick={() => setExtendModalUser(null)}>Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
