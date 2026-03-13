import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Camera, Save, Mail, GraduationCap, Calendar, Target, Clock, Flame, Award, BookOpen, Crown, Loader2, CreditCard, XCircle, ArrowRight, School, Briefcase, Lightbulb } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStudyStreakFromDB } from "@/lib/study-tracker";
import { format, differenceInDays } from "date-fns";
import { PLANS } from "@/lib/plans";
import { useNavigate } from "react-router-dom";

export const EDUCATION_TYPES = [
  { value: "school", label: "School (Class 1-12)", icon: School },
  { value: "undergraduate", label: "Undergraduate", icon: GraduationCap },
  { value: "postgraduate", label: "Postgraduate", icon: GraduationCap },
  { value: "competitive_exam", label: "Competitive Exam", icon: Target },
  { value: "professional", label: "Professional Course", icon: Briefcase },
  { value: "self_learning", label: "Self Learning", icon: Lightbulb },
] as const;

export type EducationType = typeof EDUCATION_TYPES[number]["value"];

export type EducationDetails = {
  // School
  class_level?: string;
  board?: string;
  school_name?: string;
  // UG/PG
  college_name?: string;
  course_name?: string;
  semester?: string;
  university?: string;
  // Competitive
  exam_name?: string;
  exam_date?: string;
  // Professional
  institute?: string;
  level?: string;
  // Self Learning
  learning_goal?: string;
  topics_of_interest?: string;
};

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
  education_type: string | null;
  education_details: EducationDetails | null;
};

export default function Profile() {
  const { user, userPlan } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [educationType, setEducationType] = useState<string>("");
  const [eduDetails, setEduDetails] = useState<EducationDetails>({});
  const [examTarget, setExamTarget] = useState("");

  const [payments, setPayments] = useState<any[]>([]);
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [streak, setStreak] = useState(0);
  const [badgesCount, setBadgesCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (data) {
      const p = data as any as ProfileData;
      setProfile(p);
      setDisplayName(p.display_name || "");
      setEducationType(p.education_type || "");
      setEduDetails((p.education_details as EducationDetails) || {});
      setExamTarget(p.exam_target || "");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
    if (user) {
      supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setPayments(data || []));
    }
  }, [fetchProfile, user]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("study_logs").select("duration_minutes").eq("user_id", user.id),
      getStudyStreakFromDB(),
      supabase.from("user_achievements").select("id").eq("user_id", user.id),
      supabase.from("subjects").select("id").eq("user_id", user.id),
    ]).then(([logsRes, s, badgesRes, subsRes]) => {
      setTotalStudyHours(Math.round((logsRes.data || []).reduce((a, b) => a + (b.duration_minutes || 0), 0) / 60 * 10) / 10);
      setStreak(s);
      setBadgesCount(badgesRes.data?.length || 0);
      setSubjectsCount(subsRes.data?.length || 0);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      education_type: educationType || null,
      education_details: eduDetails,
      exam_target: examTarget,
      // Keep legacy fields synced
      college: eduDetails.college_name || eduDetails.school_name || eduDetails.institute || null,
      year_of_study: eduDetails.class_level || eduDetails.semester || eduDetails.level || null,
    } as any).eq("user_id", user.id);
    if (error) toast.error("Failed to save");
    else { toast.success("Profile updated!"); setEditing(false); fetchProfile(); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed"); setUploading(false); return; }
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

  const updateDetail = (key: keyof EducationDetails, value: string) => {
    setEduDetails(prev => ({ ...prev, [key]: value }));
  };

  const getEducationLabel = () => {
    return EDUCATION_TYPES.find(t => t.value === educationType)?.label || "Not set";
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
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
              {uploading ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Camera className="w-4 h-4 text-primary-foreground" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <h2 className="text-xl font-bold mt-3 text-foreground">{profile?.display_name || "Student"}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          {educationType && (
            <p className="text-xs text-muted-foreground mt-1">{getEducationLabel()}</p>
          )}
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant={getSubscriptionStatus() === "Premium" ? "default" : "secondary"}>
              <Crown className="w-3 h-3 mr-1" />{getSubscriptionStatus()}
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
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {/* Display Name */}
            <div>
              <Label className="text-muted-foreground text-xs">Display Name</Label>
              {editing ? <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /> : <p className="text-foreground font-medium">{profile?.display_name || "—"}</p>}
            </div>

            {/* Email */}
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
              <p className="text-foreground font-medium">{profile?.email}</p>
            </div>

            {/* Education Type */}
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Education Type</Label>
              {editing ? (
                <Select value={educationType} onValueChange={v => { setEducationType(v); setEduDetails({}); }}>
                  <SelectTrigger><SelectValue placeholder="Select your education type" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-foreground font-medium">{getEducationLabel()}</p>
              )}
            </div>

            {/* Dynamic Fields Based on Education Type */}
            {educationType === "school" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Class</Label>
                    {editing ? (
                      <Select value={eduDetails.class_level || ""} onValueChange={v => updateDetail("class_level", v)}>
                        <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={`${i + 1}`}>Class {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <p className="text-foreground font-medium">{eduDetails.class_level ? `Class ${eduDetails.class_level}` : "—"}</p>}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Board</Label>
                    {editing ? (
                      <Select value={eduDetails.board || ""} onValueChange={v => updateDetail("board", v)}>
                        <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                        <SelectContent>
                          {["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Other"].map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <p className="text-foreground font-medium">{eduDetails.board || "—"}</p>}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">School Name</Label>
                  {editing ? <Input value={eduDetails.school_name || ""} onChange={e => updateDetail("school_name", e.target.value)} placeholder="e.g. Delhi Public School" /> : <p className="text-foreground font-medium">{eduDetails.school_name || "—"}</p>}
                </div>
              </>
            )}

            {(educationType === "undergraduate" || educationType === "postgraduate") && (
              <>
                <div>
                  <Label className="text-muted-foreground text-xs">College / University</Label>
                  {editing ? <Input value={eduDetails.college_name || ""} onChange={e => updateDetail("college_name", e.target.value)} placeholder="e.g. IIT Delhi, SPPU" /> : <p className="text-foreground font-medium">{eduDetails.college_name || "—"}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Course Name</Label>
                    {editing ? <Input value={eduDetails.course_name || ""} onChange={e => updateDetail("course_name", e.target.value)} placeholder="e.g. B.Tech CSE, BBA, M.Sc" /> : <p className="text-foreground font-medium">{eduDetails.course_name || "—"}</p>}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Semester</Label>
                    {editing ? (
                      <Select value={eduDetails.semester || ""} onValueChange={v => updateDetail("semester", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => (
                            <SelectItem key={i + 1} value={`${i + 1}`}>Semester {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <p className="text-foreground font-medium">{eduDetails.semester ? `Semester ${eduDetails.semester}` : "—"}</p>}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">University</Label>
                  {editing ? <Input value={eduDetails.university || ""} onChange={e => updateDetail("university", e.target.value)} placeholder="e.g. Mumbai University" /> : <p className="text-foreground font-medium">{eduDetails.university || "—"}</p>}
                </div>
              </>
            )}

            {educationType === "competitive_exam" && (
              <>
                <div>
                  <Label className="text-muted-foreground text-xs">Exam Name</Label>
                  {editing ? (
                    <Select value={eduDetails.exam_name || ""} onValueChange={v => updateDetail("exam_name", v)}>
                      <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                      <SelectContent>
                        {["JEE Main", "JEE Advanced", "NEET", "UPSC", "CAT", "GATE", "SSC", "Banking (IBPS/SBI)", "CLAT", "NDA", "Other"].map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : <p className="text-foreground font-medium">{eduDetails.exam_name || "—"}</p>}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Exam Date</Label>
                  {editing ? <Input type="date" value={eduDetails.exam_date || ""} onChange={e => updateDetail("exam_date", e.target.value)} /> : <p className="text-foreground font-medium">{eduDetails.exam_date ? format(new Date(eduDetails.exam_date), "dd MMM yyyy") : "—"}</p>}
                </div>
              </>
            )}

            {educationType === "professional" && (
              <>
                <div>
                  <Label className="text-muted-foreground text-xs">Course Name</Label>
                  {editing ? <Input value={eduDetails.course_name || ""} onChange={e => updateDetail("course_name", e.target.value)} placeholder="e.g. CA, CS, CFA, AWS" /> : <p className="text-foreground font-medium">{eduDetails.course_name || "—"}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Institute</Label>
                    {editing ? <Input value={eduDetails.institute || ""} onChange={e => updateDetail("institute", e.target.value)} placeholder="e.g. ICAI" /> : <p className="text-foreground font-medium">{eduDetails.institute || "—"}</p>}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Level</Label>
                    {editing ? <Input value={eduDetails.level || ""} onChange={e => updateDetail("level", e.target.value)} placeholder="e.g. Foundation, Inter, Final" /> : <p className="text-foreground font-medium">{eduDetails.level || "—"}</p>}
                  </div>
                </div>
              </>
            )}

            {educationType === "self_learning" && (
              <>
                <div>
                  <Label className="text-muted-foreground text-xs">Learning Goal</Label>
                  {editing ? <Input value={eduDetails.learning_goal || ""} onChange={e => updateDetail("learning_goal", e.target.value)} placeholder="e.g. Learn Web Development, Master Python" /> : <p className="text-foreground font-medium">{eduDetails.learning_goal || "—"}</p>}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Topics of Interest</Label>
                  {editing ? <Input value={eduDetails.topics_of_interest || ""} onChange={e => updateDetail("topics_of_interest", e.target.value)} placeholder="e.g. React, AI/ML, Data Science" /> : <p className="text-foreground font-medium">{eduDetails.topics_of_interest || "—"}</p>}
                </div>
              </>
            )}

            {/* Exam Target (universal) */}
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1"><Target className="w-3 h-3" /> Study Goal / Target</Label>
              {editing ? <Input value={examTarget} onChange={(e) => setExamTarget(e.target.value)} placeholder="e.g. Score 90%+, Clear exam in first attempt" /> : <p className="text-foreground font-medium">{profile?.exam_target || "—"}</p>}
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" /> Subscription
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Plan</p>
              <p className="font-semibold text-foreground capitalize">{PLANS[userPlan]?.name || "Free"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-semibold text-foreground">{PLANS[userPlan]?.priceLabel || "₹0/mo"}</p>
            </div>
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
          <div className="flex gap-3 pt-2">
            <Button size="sm" onClick={() => navigate("/pricing")} className="gap-1">
              <ArrowRight className="w-3 h-3" /> View Plans
            </Button>
            {userPlan !== "free" && (
              <Button size="sm" variant="destructive" className="gap-1" onClick={async () => {
                await supabase.from("profiles").update({ current_plan: "free", is_subscribed: false } as any).eq("user_id", user!.id);
                toast.success("Subscription cancelled. You're now on the Free plan.");
                fetchProfile();
              }}>
                <XCircle className="w-3 h-3" /> Cancel Subscription
              </Button>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment History
          </h3>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground capitalize">{p.plan} Plan</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), "dd MMM yyyy HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">₹{p.amount / 100}</p>
                    <Badge variant={p.status === "success" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Account Info
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="font-semibold text-foreground">{profile?.created_at ? format(new Date(profile.created_at), "dd MMM yyyy") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Active</p>
              <p className="font-semibold text-foreground">{profile?.last_active_at ? format(new Date(profile.last_active_at), "dd MMM yyyy HH:mm") : "—"}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
