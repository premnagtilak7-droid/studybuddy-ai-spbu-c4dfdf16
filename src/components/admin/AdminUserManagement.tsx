import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Download, X, Ban, ShieldCheck, CreditCard, Trash2,
  ToggleLeft, ToggleRight, Key, Calendar, Filter, ChevronDown,
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

type Profile = {
  user_id: string; email: string; display_name: string | null;
  is_subscribed: boolean; is_banned: boolean; ban_reason: string | null;
  premium_expires_at: string | null; created_at: string;
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
};

export default function AdminUserManagement({ profiles, userStats, onRefresh, subjects, studyLogs, doubts }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [premiumUserId, setPremiumUserId] = useState<string | null>(null);
  const [premiumExpiry, setPremiumExpiry] = useState("");

  const filteredUsers = userStats.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === "all" || (filterPlan === "premium" ? u.is_subscribed : !u.is_subscribed);
    const matchesStatus = filterStatus === "all" || (filterStatus === "banned" ? u.is_banned : !u.is_banned);
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
    // We can only delete user data from public tables, not auth.users
    await Promise.all([
      supabase.from("profiles").delete().eq("user_id", userId),
      supabase.from("subjects").delete().eq("user_id", userId),
      supabase.from("study_logs").delete().eq("user_id", userId),
      supabase.from("doubt_history").delete().eq("user_id", userId),
      supabase.from("activity_logs").delete().eq("user_id", userId),
    ]);
    toast.success("User data deleted");
    setDeleteUserId(null);
    onRefresh();
  };

  const grantPremium = async (userId: string, expiryDate?: string) => {
    await supabase.from("profiles").update({
      is_subscribed: true,
      premium_expires_at: expiryDate || null,
    } as any).eq("user_id", userId);
    toast.success("Premium granted");
    setPremiumUserId(null);
    setPremiumExpiry("");
    onRefresh();
  };

  const revokePremium = async (userId: string) => {
    await supabase.from("profiles").update({
      is_subscribed: false,
      premium_expires_at: null,
    } as any).eq("user_id", userId);
    toast.success("Premium revoked");
    onRefresh();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) return toast.error(error.message);
    toast.success(`Password reset email sent to ${email}`);
  };

  const exportCSV = () => {
    const headers = ["Email", "Name", "Plan", "Status", "Join Date", "Study Hours", "Subjects", "Doubts", "Streak"];
    const rows = filteredUsers.map(u => [
      u.email, u.display_name || "", u.is_subscribed ? "Premium" : "Free",
      u.is_banned ? "Banned" : "Active", new Date(u.created_at).toLocaleDateString(),
      u.totalHours, u.subjectCount, u.doubtCount, u.streak,
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
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
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Joined</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Last Active</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Plan</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                  onClick={() => setSelectedUser(u.user_id)}>
                  <td className="p-3 font-mono text-muted-foreground text-xs">{i + 1}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                  <td className="p-3 font-medium text-foreground text-xs">{u.display_name || "—"}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{u.lastStudy}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.is_subscribed ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{u.is_subscribed ? "PRO" : "FREE"}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.is_banned ? "bg-destructive/20 text-destructive" : "bg-green-500/20 text-green-600"
                    }`}>{u.is_banned ? "BANNED" : "ACTIVE"}</span>
                  </td>
                  <td className="p-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {u.is_banned ? (
                        <Button variant="ghost" size="sm" onClick={() => unbanUser(u.user_id)} title="Unban">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => banUser(u.user_id)} title="Ban">
                          <Ban className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => {
                        u.is_subscribed ? revokePremium(u.user_id) : setPremiumUserId(u.user_id);
                      }} title={u.is_subscribed ? "Revoke Premium" : "Grant Premium"}>
                        {u.is_subscribed ? <ToggleRight className="w-3.5 h-3.5 text-primary" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteUserId(u.user_id)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
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
        {selectedUserData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 max-w-lg w-full space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-foreground">{selectedUserData.display_name || "Unnamed"}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedUserData.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: "Subjects", value: selectedUserData.subjectCount },
                  { label: "Study Hours", value: `${selectedUserData.totalHours}h` },
                  { label: "Doubts Asked", value: selectedUserData.doubtCount },
                  { label: "Topics Done", value: selectedUserData.topicsCompleted },
                  { label: "Streak", value: `${selectedUserData.streak}🔥` },
                  { label: "Plan", value: selectedUserData.is_subscribed ? "Premium ✨" : "Free" },
                ].map(s => (
                  <div key={s.label} className="bg-secondary/50 p-3 rounded-lg text-center">
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Joined: {new Date(selectedUserData.created_at).toLocaleDateString()}</p>
                <p>Last Study: {selectedUserData.lastStudy}</p>
                <p>Status: {selectedUserData.is_banned ? "🚫 Banned" : "✅ Active"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => resetPassword(selectedUserData.email)}>
                  <Key className="w-3.5 h-3.5 mr-1" /> Reset Password
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  selectedUserData.is_subscribed
                    ? revokePremium(selectedUserData.user_id)
                    : grantPremium(selectedUserData.user_id);
                  setSelectedUser(null);
                }}>
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  {selectedUserData.is_subscribed ? "Revoke Premium" : "Grant Premium"}
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
              This will permanently delete all user data (subjects, study logs, doubts, activity). This action cannot be undone.
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

      {/* Grant Premium with Expiry Modal */}
      <AnimatePresence>
        {premiumUserId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPremiumUserId(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-card p-6 max-w-sm w-full space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-foreground">Grant Premium Access</h3>
              <div>
                <label className="text-xs text-muted-foreground">Expiry Date (optional)</label>
                <Input type="date" value={premiumExpiry} onChange={e => setPremiumExpiry(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => grantPremium(premiumUserId, premiumExpiry || undefined)} className="flex-1">Grant Premium</Button>
                <Button variant="outline" onClick={() => setPremiumUserId(null)}>Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
