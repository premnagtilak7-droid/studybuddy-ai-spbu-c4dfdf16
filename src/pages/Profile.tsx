import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Camera, Save, Mail, GraduationCap, Calendar, Target, Clock, Flame, Award, BookOpen, Crown, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStudyStreakFromDB } from "@/lib/study-tracker";
import { getUserXP } from "@/lib/xp-store";
import { format, differenceInDays } from "date-fns";

type ProfileData = {
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  college: string | null;
  branch: string | null;
  year_of_study: string | null;
  exam_target: string | null;
  is_subscribed: boolean;
  premium_expires_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  is_trial_active: boolean;
  created_at: string;
  last_active_at: string | null;
};

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [examTarget, setExamTarget] = useState("");

  // Stats
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badgesCount, setBadgesCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) {
      const p = data as any as ProfileData;
      setProfile(p);
      setDisplayName(p.display_name || "");
      setCollege(p.college || "");
      setBranch(p.branch || "");
      setYearOfStudy(p.year_of_study || "");
      setExamTarget(p.exam_target || "");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!user) return;
    // Fetch stats
    Promise.all([
      supabase.from("study_logs").select("duration_minutes").eq("user_id", user.id),
      getStudyStreakFromDB(),
      supabase.from("user_achievements").select("id").eq("user_id", user.id),
      supabase.from("subjects").select("id").eq("user_id", user.id),
    ]).then(([logsRes, s, badgesRes, subsRes]) => {
      const totalMins = (logsRes.data || []).reduce((a, b) => a + (b.duration_minutes || 0), 0);
      setTotalStudyHours(Math.round(totalMins / 60 * 10) / 10);
      setStreak(s);
      setBadgesCount(badgesRes.data?.length || 0);
      setSubjectsCount(subsRes.data?.length || 0);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        college,
        branch,
        year_of_study: yearOfStudy,
        exam_target: examTarget,
      } as any)
      .eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else {
      toast.success("Profile updated!");
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;

    // Check if bucket exists, upload
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl } as any).eq("user_id", user.id);
    toast.success("Photo updated!");
    fetchProfile();
    setUploading(false);
  };

  const getTrialDaysRemaining = () => {
    if (!profile?.trial_end) return 0;
    return Math.max(0, differenceInDays(new Date(profile.trial_end), new Date()));
  };

  const getSubscriptionStatus = () => {
    if (profile?.is_subscribed) return "Premium";
    if (profile?.is_trial_active && getTrialDaysRemaining() > 0) return "Free Trial";
    return "Free";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        {/* Header Card */}
        <div className="glass-card p-6 text-center relative">
          <div className="relative inline-block">
            <Avatar className="w-24 h-24 mx-auto border-4 border-primary/30">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {(profile?.display_name || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors">
              {uploading ? (
                <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <h2 className="text-xl font-bold mt-3 text-foreground">{profile?.display_name || "Student"}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant={getSubscriptionStatus() === "Premium" ? "default" : "secondary"}>
              <Crown className="w-3 h-3 mr-1" />
              {getSubscriptionStatus()}
            </Badge>
            {profile?.is_trial_active && getTrialDaysRemaining() > 0 && !profile?.is_subscribed && (
              <Badge variant="outline">{getTrialDaysRemaining()} days left</Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Clock, label: "Study Hours", value: totalStudyHours, color: "text-blue-500" },
            { icon: Flame, label: "Streak", value: `${streak}d`, color: "text-orange-500" },
            { icon: Award, label: "Badges", value: badgesCount, color: "text-yellow-500" },
            { icon: BookOpen, label: "Subjects", value: subjectsCount, color: "text-green-500" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <stat.icon className={`w-5 h-5 mx-auto ${stat.color}`} />
              <p className="text-lg font-bold text-foreground mt-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Profile Details */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <User className="w-5 h-5" /> Profile Details
            </h3>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); fetchProfile(); }}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Display Name</Label>
              {editing ? (
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              ) : (
                <p className="text-foreground font-medium">{profile?.display_name || "—"}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
              <p className="text-foreground font-medium">{profile?.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1"><GraduationCap className="w-3 h-3" /> College/University</Label>
              {editing ? (
                <Input value={college} onChange={(e) => setCollege(e.target.value)} placeholder="e.g. SPPU, MIT" />
              ) : (
                <p className="text-foreground font-medium">{profile?.college || "—"}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Branch</Label>
                {editing ? (
                  <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. CSE, ECE" />
                ) : (
                  <p className="text-foreground font-medium">{profile?.branch || "—"}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Year of Study</Label>
                {editing ? (
                  <Input value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} placeholder="e.g. 2nd Year" />
                ) : (
                  <p className="text-foreground font-medium">{profile?.year_of_study || "—"}</p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1"><Target className="w-3 h-3" /> Exam Target</Label>
              {editing ? (
                <Input value={examTarget} onChange={(e) => setExamTarget(e.target.value)} placeholder="e.g. 9+ CGPA, GATE" />
              ) : (
                <p className="text-foreground font-medium">{profile?.exam_target || "—"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" /> Subscription
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-semibold text-foreground">{getSubscriptionStatus()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-semibold text-foreground">
                {profile?.is_subscribed ? "Premium" : profile?.is_trial_active ? "Trial" : "Free"}
              </p>
            </div>
            {(profile?.is_subscribed && profile?.premium_expires_at) && (
              <>
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-semibold text-foreground">{format(new Date(profile.premium_expires_at), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days Remaining</p>
                  <p className="font-semibold text-foreground">{Math.max(0, differenceInDays(new Date(profile.premium_expires_at), new Date()))}</p>
                </div>
              </>
            )}
            {profile?.is_trial_active && !profile?.is_subscribed && profile?.trial_end && (
              <>
                <div>
                  <p className="text-muted-foreground">Trial Ends</p>
                  <p className="font-semibold text-foreground">{format(new Date(profile.trial_end), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days Remaining</p>
                  <p className="font-semibold text-foreground">{getTrialDaysRemaining()}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Account Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="font-semibold text-foreground">
                {profile?.created_at ? format(new Date(profile.created_at), "dd MMM yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Active</p>
              <p className="font-semibold text-foreground">
                {profile?.last_active_at ? format(new Date(profile.last_active_at), "dd MMM yyyy HH:mm") : "—"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
