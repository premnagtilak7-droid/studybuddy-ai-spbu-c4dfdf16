import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, UserCheck, Clock, BookOpen, Check, X, Handshake } from "lucide-react";

type BuddyProfile = {
  user_id: string;
  subjects: string[];
  study_hours_per_day: number;
  preferred_time: string;
  display_name?: string;
  email?: string;
  xp?: number;
};

type BuddyRequest = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
  from_name?: string;
  to_name?: string;
};

export default function StudyBuddy() {
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<BuddyProfile | null>(null);
  const [matches, setMatches] = useState<BuddyProfile[]>([]);
  const [requests, setRequests] = useState<BuddyRequest[]>([]);
  const [buddies, setBuddies] = useState<BuddyProfile[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ subjects: "", study_hours: 4, preferred_time: "evening" });

  useEffect(() => { loadProfile(); loadRequests(); }, []);
  useEffect(() => { if (myProfile) findMatches(); }, [myProfile]);

  async function loadProfile() {
    const { data } = await supabase.from("buddy_profiles").select("*").eq("user_id", user!.id).single();
    if (data) {
      const profile = data as any;
      setMyProfile(profile);
      setForm({ subjects: profile.subjects?.join(", ") || "", study_hours: profile.study_hours_per_day, preferred_time: profile.preferred_time });
    } else {
      setEditing(true);
    }
  }

  async function loadRequests() {
    const { data } = await supabase.from("buddy_requests").select("*").or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`);
    if (!data) return;
    const userIds = [...new Set(data.flatMap(r => [r.from_user_id, r.to_user_id]))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
    setRequests(data.map(r => ({
      ...r,
      from_name: profiles?.find(p => p.user_id === r.from_user_id)?.display_name || profiles?.find(p => p.user_id === r.from_user_id)?.email || "User",
      to_name: profiles?.find(p => p.user_id === r.to_user_id)?.display_name || profiles?.find(p => p.user_id === r.to_user_id)?.email || "User",
    })) as BuddyRequest[]);

    // Load accepted buddies
    const accepted = data.filter(r => r.status === "accepted");
    const buddyIds = accepted.map(r => r.from_user_id === user!.id ? r.to_user_id : r.from_user_id);
    if (buddyIds.length) {
      const { data: buddyProfiles } = await supabase.from("buddy_profiles").select("*").in("user_id", buddyIds);
      const { data: bProfiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", buddyIds);
      const { data: bXp } = await supabase.from("user_xp").select("user_id, total_xp").in("user_id", buddyIds);
      setBuddies((buddyProfiles || []).map((bp: any) => ({
        ...bp,
        display_name: bProfiles?.find(p => p.user_id === bp.user_id)?.display_name,
        email: bProfiles?.find(p => p.user_id === bp.user_id)?.email,
        xp: bXp?.find(x => x.user_id === bp.user_id)?.total_xp || 0,
      })));
    }
  }

  async function findMatches() {
    if (!myProfile) return;
    const { data } = await supabase.from("buddy_profiles").select("*").neq("user_id", user!.id).limit(20);
    if (!data) return;
    const userIds = data.map((d: any) => d.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
    const { data: xpData } = await supabase.from("user_xp").select("user_id, total_xp").in("user_id", userIds);

    // Score matches by subject overlap and time preference
    const scored = data.map((bp: any) => {
      const subjectOverlap = (bp.subjects || []).filter((s: string) => myProfile.subjects?.includes(s)).length;
      const timeMatch = bp.preferred_time === myProfile.preferred_time ? 1 : 0;
      return {
        ...bp,
        display_name: profiles?.find(p => p.user_id === bp.user_id)?.display_name,
        email: profiles?.find(p => p.user_id === bp.user_id)?.email,
        xp: xpData?.find(x => x.user_id === bp.user_id)?.total_xp || 0,
        score: subjectOverlap * 2 + timeMatch,
      };
    }).sort((a: any, b: any) => b.score - a.score);

    setMatches(scored as BuddyProfile[]);
  }

  async function saveProfile() {
    const subjects = form.subjects.split(",").map(s => s.trim()).filter(Boolean);
    const payload = { user_id: user!.id, subjects, study_hours_per_day: form.study_hours, preferred_time: form.preferred_time };
    if (myProfile) {
      await supabase.from("buddy_profiles").update(payload).eq("user_id", user!.id);
    } else {
      await supabase.from("buddy_profiles").insert(payload);
    }
    toast.success("Profile saved!");
    setEditing(false);
    loadProfile();
  }

  async function sendRequest(toUserId: string) {
    const { error } = await supabase.from("buddy_requests").insert({ from_user_id: user!.id, to_user_id: toUserId });
    if (error?.code === "23505") { toast.error("Request already sent"); } else if (error) { toast.error("Failed"); } else { toast.success("Buddy request sent!"); loadRequests(); }
  }

  async function respondRequest(requestId: string, status: string) {
    await supabase.from("buddy_requests").update({ status }).eq("id", requestId);
    toast.success(status === "accepted" ? "Buddy accepted!" : "Request rejected");
    loadRequests();
  }

  const pendingIncoming = requests.filter(r => r.to_user_id === user!.id && r.status === "pending");
  const pendingSent = requests.filter(r => r.from_user_id === user!.id && r.status === "pending");
  const sentToIds = requests.map(r => r.to_user_id);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Study Buddy</h1>
            <p className="text-muted-foreground text-sm">Find your perfect study partner</p>
          </div>
          {myProfile && !editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit Profile</Button>}
        </div>

        {/* Profile Setup */}
        {editing && (
          <Card>
            <CardHeader><CardTitle className="text-base">Your Study Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Subjects (comma-separated)</Label><Input value={form.subjects} onChange={e => setForm({ ...form, subjects: e.target.value })} placeholder="e.g. DSA, DBMS, OS" /></div>
              <div><Label>Study hours per day</Label><Input type="number" value={form.study_hours} onChange={e => setForm({ ...form, study_hours: parseFloat(e.target.value) || 4 })} /></div>
              <div><Label>Preferred study time</Label>
                <Select value={form.preferred_time} onValueChange={v => setForm({ ...form, preferred_time: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6-10 AM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-4 PM)</SelectItem>
                    <SelectItem value="evening">Evening (4-8 PM)</SelectItem>
                    <SelectItem value="night">Night (8 PM-12 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveProfile}>Save Profile</Button>
            </CardContent>
          </Card>
        )}

        {/* Incoming Requests */}
        {pendingIncoming.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Incoming Requests</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pendingIncoming.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium text-foreground">{r.from_name} wants to be your study buddy</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondRequest(r.id, "accepted")}><Check className="w-4 h-4 mr-1" />Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => respondRequest(r.id, "rejected")}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* My Buddies */}
        {buddies.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Handshake className="w-5 h-5" />My Buddies</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {buddies.map(b => (
                <div key={b.user_id} className="p-3 rounded-lg border border-border bg-card">
                  <p className="font-medium text-sm text-foreground">{b.display_name || b.email}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {b.subjects?.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.study_hours_per_day}h/day</span>
                    <span>{b.xp || 0} XP</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Suggested Matches */}
        {myProfile && (
          <Card>
            <CardHeader><CardTitle className="text-base">Suggested Matches</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matches.length === 0 && <p className="text-muted-foreground text-sm col-span-2">No matches found yet. More users need to set up their profiles.</p>}
              {matches.map(m => {
                const alreadySent = sentToIds.includes(m.user_id);
                const alreadyBuddy = buddies.some(b => b.user_id === m.user_id);
                return (
                  <div key={m.user_id} className="p-3 rounded-lg border border-border bg-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm text-foreground">{m.display_name || m.email}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {m.subjects?.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.study_hours_per_day}h/day</span>
                          <span className="capitalize">{m.preferred_time}</span>
                          <span>{m.xp || 0} XP</span>
                        </div>
                      </div>
                      {alreadyBuddy ? (
                        <Badge className="bg-success text-success-foreground"><UserCheck className="w-3 h-3 mr-1" />Buddy</Badge>
                      ) : alreadySent ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => sendRequest(m.user_id)}><UserPlus className="w-4 h-4 mr-1" />Add</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
