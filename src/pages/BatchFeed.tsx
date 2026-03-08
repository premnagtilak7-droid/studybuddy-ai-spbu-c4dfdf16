import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, TrendingUp, BookOpen, Flame } from "lucide-react";

const YEARS = ["SE (Second Year)", "TE (Third Year)", "BE (Final Year)"];
const BRANCHES = ["Computer Engineering", "IT Engineering", "Mechanical", "Civil", "Electronics", "Electrical", "ENTC"];

type FeedItem = {
  id: string;
  message: string;
  icon: "study" | "streak" | "topic";
  timestamp: string;
};

export default function BatchFeed() {
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<{ year: string; branch: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ year: "", branch: "" });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [batchStats, setBatchStats] = useState({ totalStudents: 0, activeToday: 0, topicsToday: 0 });

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (myProfile) loadFeed(); }, [myProfile]);

  async function loadProfile() {
    const { data } = await supabase.from("batch_profiles").select("*").eq("user_id", user!.id).single();
    if (data) {
      setMyProfile({ year: (data as any).year, branch: (data as any).branch });
      setForm({ year: (data as any).year, branch: (data as any).branch });
    } else {
      setEditing(true);
    }
  }

  async function saveProfile() {
    if (!form.year || !form.branch) return;
    if (myProfile) {
      await supabase.from("batch_profiles").update({ year: form.year, branch: form.branch }).eq("user_id", user!.id);
    } else {
      await supabase.from("batch_profiles").insert({ user_id: user!.id, year: form.year, branch: form.branch });
    }
    toast.success("Batch profile saved!");
    setEditing(false);
    setMyProfile({ year: form.year, branch: form.branch });
  }

  async function loadFeed() {
    if (!myProfile) return;
    // Get batchmates
    const { data: batchmates } = await supabase.from("batch_profiles").select("user_id").eq("year", myProfile.year).eq("branch", myProfile.branch);
    if (!batchmates?.length) return;
    const batchUserIds = batchmates.map(b => (b as any).user_id).filter((id: string) => id !== user!.id);
    setBatchStats(prev => ({ ...prev, totalStudents: batchmates.length }));

    // Get today's study activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayLogs } = await supabase.from("study_logs").select("user_id, duration_minutes").in("user_id", batchUserIds).gte("logged_at", today.toISOString());
    const activeUsers = new Set(todayLogs?.map(l => l.user_id) || []);
    setBatchStats(prev => ({ ...prev, activeToday: activeUsers.size }));

    // Get today's completed topics
    const { data: todayTopics } = await supabase.from("topics").select("id").eq("is_completed", true).gte("completed_at", today.toISOString());
    const topicsCount = todayTopics?.length || 0;
    setBatchStats(prev => ({ ...prev, topicsToday: topicsCount }));

    // Generate feed items
    const feedItems: FeedItem[] = [];
    if (activeUsers.size > 0) {
      feedItems.push({
        id: "active",
        message: `${activeUsers.size} student${activeUsers.size > 1 ? "s" : ""} in your batch studied today 📚`,
        icon: "study",
        timestamp: new Date().toISOString(),
      });
    }
    if (topicsCount > 0) {
      feedItems.push({
        id: "topics",
        message: `${topicsCount} topic${topicsCount > 1 ? "s" : ""} completed by your batchmates today 🎯`,
        icon: "topic",
        timestamp: new Date().toISOString(),
      });
    }
    const totalMinutes = todayLogs?.reduce((acc, l) => acc + l.duration_minutes, 0) || 0;
    if (totalMinutes > 0) {
      feedItems.push({
        id: "hours",
        message: `Your batch logged ${Math.round(totalMinutes / 60 * 10) / 10} hours of study today ⏱️`,
        icon: "study",
        timestamp: new Date().toISOString(),
      });
    }
    if (feedItems.length === 0) {
      feedItems.push({
        id: "empty",
        message: "No activity from your batchmates yet today. Be the first to start! 💪",
        icon: "streak",
        timestamp: new Date().toISOString(),
      });
    }
    setFeed(feedItems);
  }

  const iconMap = {
    study: <BookOpen className="w-5 h-5 text-primary" />,
    streak: <Flame className="w-5 h-5 text-accent" />,
    topic: <TrendingUp className="w-5 h-5 text-success" />,
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batch Feed</h1>
            <p className="text-muted-foreground text-sm">See what your batchmates are up to</p>
          </div>
          {myProfile && !editing && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{myProfile.year}</Badge>
              <Badge variant="secondary">{myProfile.branch}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            </div>
          )}
        </div>

        {editing && (
          <Card>
            <CardHeader><CardTitle className="text-base">Set Your Batch</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Year</Label>
                <Select value={form.year} onValueChange={v => setForm({ ...form, year: v })}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Branch</Label>
                <Select value={form.branch} onValueChange={v => setForm({ ...form, branch: v })}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={saveProfile}>Save</Button>
            </CardContent>
          </Card>
        )}

        {myProfile && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4 text-center">
                <Users className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-foreground">{batchStats.totalStudents}</p>
                <p className="text-xs text-muted-foreground">In Batch</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <Flame className="w-6 h-6 mx-auto text-accent mb-1" />
                <p className="text-2xl font-bold text-foreground">{batchStats.activeToday}</p>
                <p className="text-xs text-muted-foreground">Active Today</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <BookOpen className="w-6 h-6 mx-auto text-success mb-1" />
                <p className="text-2xl font-bold text-foreground">{batchStats.topicsToday}</p>
                <p className="text-xs text-muted-foreground">Topics Today</p>
              </CardContent></Card>
            </div>

            {/* Feed */}
            <div className="space-y-3">
              {feed.map(item => (
                <Card key={item.id}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {iconMap[item.icon]}
                    </div>
                    <p className="text-sm text-foreground">{item.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
