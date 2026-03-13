import { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import { Users, Plus, LogIn, Send, Trophy, Crown, Flame, Clock, BookOpen, Share2, Video, LogOut, Bell, CalendarDays, ClipboardList } from "lucide-react";
import type { Group, MemberWithStats, Message } from "@/components/study-groups/types";
import { sendGroupNotification, loadMemberStats } from "@/components/study-groups/GroupHelpers";
import GroupSettingsDialog from "@/components/study-groups/GroupSettingsDialog";
import GroupNotifications from "@/components/study-groups/GroupNotifications";
import GroupAssignments from "@/components/study-groups/GroupAssignments";
import GroupCalendar from "@/components/study-groups/GroupCalendar";
import GroupAchievements from "@/components/study-groups/GroupAchievements";

export default function StudyGroups() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberWithStats[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newGroup, setNewGroup] = useState({ name: "", subject_focus: "", max_members: 10 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [meetActive, setMeetActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) loadMyGroups(); }, [user]);
  useEffect(() => {
    if (!selectedGroup) { setMembers([]); setMessages([]); return; }
    loadMembers(selectedGroup.id);
    loadMessages(selectedGroup.id);
  }, [selectedGroup]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime messages
  useEffect(() => {
    if (!selectedGroup) return;
    const channel = supabase.channel(`group-${selectedGroup.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${selectedGroup.id}` }, () => loadMessages(selectedGroup.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup]);

  const reloadMembers = useCallback(() => { if (selectedGroup) loadMembers(selectedGroup.id); }, [selectedGroup]);
  const reloadAll = useCallback(() => { loadMyGroups(); if (selectedGroup) { loadMembers(selectedGroup.id); loadMessages(selectedGroup.id); } }, [selectedGroup]);
  useRealtimeSubscription("study_logs", reloadMembers);
  useRealtimeSubscription("group_members", reloadAll);
  useRealtimeSubscription("group_messages", reloadAll);

  async function loadMyGroups() {
    if (!user) return;
    const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
    if (!memberships?.length) { setMyGroups([]); setSelectedGroup(null); return; }
    const ids = memberships.map(m => m.group_id);
    const { data } = await supabase.from("study_groups").select("*").in("id", ids);
    const groups = (data || []) as Group[];
    setMyGroups(groups);
    setSelectedGroup(prev => {
      if (!groups.length) return null;
      if (!prev) return groups[0];
      return groups.find(g => g.id === prev.id) ?? groups[0];
    });
  }

  async function loadMembers(groupId: string) {
    const { data } = await supabase.from("group_members").select("user_id, joined_at").eq("group_id", groupId);
    if (!data) { setMembers([]); return; }
    const enriched = await loadMemberStats(data, data.map(m => m.user_id));
    setMembers(enriched);
  }

  async function loadMessages(groupId: string) {
    const { data } = await supabase.from("group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true }).limit(100);
    if (!data) { setMessages([]); return; }
    const userIds = [...new Set(data.map(m => m.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, display_name").in("user_id", userIds);
    setMessages(data.map(m => {
      const p = profiles?.find(p => p.user_id === m.user_id);
      return { ...m, email: p?.display_name || p?.email || "User" };
    }));
  }

  async function createGroup() {
    if (!newGroup.name || !newGroup.subject_focus) return;
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase.from("study_groups").insert({
      name: newGroup.name, subject_focus: newGroup.subject_focus, max_members: newGroup.max_members, join_code: code, created_by: user!.id
    }).select().single();
    if (error) { toast.error("Failed to create group"); setLoading(false); return; }
    await supabase.from("group_members").insert({ group_id: (data as any).id, user_id: user!.id });
    await sendGroupNotification((data as any).id, user!.id, "info", `${user?.email?.split("@")[0]} created this group`);
    toast.success(`Group created! Join code: ${code}`);
    setCreateOpen(false);
    setNewGroup({ name: "", subject_focus: "", max_members: 10 });
    loadMyGroups();
    setLoading(false);
  }

  async function joinGroup() {
    if (!joinCode.trim()) return;
    setLoading(true);
    const { data: group } = await supabase.from("study_groups").select("*").eq("join_code", joinCode.toUpperCase()).single();
    if (!group) { toast.error("Invalid join code"); setLoading(false); return; }
    const g = group as any;
    const { error } = await supabase.from("group_members").insert({ group_id: g.id, user_id: user!.id });
    if (error?.code === "23505") { toast.error("Already a member"); }
    else if (error) { toast.error("Failed to join"); }
    else {
      await sendGroupNotification(g.id, user!.id, "join", `${user?.email?.split("@")[0]} joined the group`);
      toast.success(`Joined ${g.name}!`);
      loadMyGroups();
    }
    setJoinCode("");
    setLoading(false);
  }

  async function leaveGroup() {
    if (!selectedGroup || !user) return;
    if (selectedGroup.created_by === user.id) { toast.error("As admin, delete the group or transfer ownership first"); return; }
    await supabase.from("group_members").delete().eq("group_id", selectedGroup.id).eq("user_id", user.id);
    await sendGroupNotification(selectedGroup.id, user.id, "leave", `${user.email?.split("@")[0]} left the group`);
    toast.success("Left the group");
    setSelectedGroup(null);
    loadMyGroups();
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedGroup) return;
    await supabase.from("group_messages").insert({ group_id: selectedGroup.id, user_id: user!.id, message: newMessage });
    setNewMessage("");
  }

  async function shareMyProgress() {
    if (!selectedGroup) return;
    const { data: mySubjects } = await supabase.from("subjects").select("name, code, completed_units, target_units").eq("user_id", user!.id);
    if (!mySubjects?.length) { toast.error("No subjects to share"); return; }
    const summary = mySubjects.map(s => `${s.code}: ${Math.round((s.completed_units / s.target_units) * 100)}%`).join(", ");
    await supabase.from("group_messages").insert({ group_id: selectedGroup.id, user_id: user!.id, message: `📊 My Progress: ${summary}` });
    toast.success("Progress shared!");
  }

  const isAdmin = selectedGroup ? selectedGroup.created_by === user?.id : false;
  const sortedByHours = [...members].sort((a, b) => (b.weekly_hours || 0) - (a.weekly_hours || 0));
  const memberCount = members.length;
  const userName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Study Groups</h1>
            <p className="text-muted-foreground text-sm">Collaborate with your peers</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Create</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Study Group</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Group Name</Label><Input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="e.g. DSA Warriors" /></div>
                  <div><Label>Subject Focus</Label><Input value={newGroup.subject_focus} onChange={e => setNewGroup({ ...newGroup, subject_focus: e.target.value })} placeholder="e.g. Data Structures" /></div>
                  <div><Label>Max Members</Label><Input type="number" value={newGroup.max_members} onChange={e => setNewGroup({ ...newGroup, max_members: parseInt(e.target.value) || 10 })} /></div>
                  <Button onClick={createGroup} disabled={loading} className="w-full">Create Group</Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex gap-1">
              <Input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Join code" className="w-28" />
              <Button variant="outline" size="sm" onClick={joinGroup} disabled={loading}><LogIn className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Group list sidebar */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">My Groups</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myGroups.length === 0 && <p className="text-muted-foreground text-xs">No groups yet. Create or join one!</p>}
              {myGroups.map(g => (
                <button key={g.id} onClick={() => setSelectedGroup(g)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedGroup?.id === g.id ? "bg-primary/10 border-primary" : "border-border hover:bg-muted"}`}>
                  <p className="font-medium text-sm text-foreground">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.subject_focus}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px]">Code: {g.join_code}</Badge>
                    {g.privacy === "private" && <Badge variant="secondary" className="text-[10px]">Private</Badge>}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Main content */}
          <div className="lg:col-span-2">
            {!selectedGroup ? (
              <Card className="h-96 flex items-center justify-center"><p className="text-muted-foreground">Select a group to view</p></Card>
            ) : (
              <div className="space-y-3">
                {/* Group header with info and actions */}
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{selectedGroup.name}</h2>
                        {selectedGroup.description && <p className="text-xs text-muted-foreground">{selectedGroup.description}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] gap-1"><Users className="w-2.5 h-2.5" />{memberCount} members</Badge>
                          <Badge variant="outline" className="text-[10px] gap-1"><CalendarDays className="w-2.5 h-2.5" />Created {new Date(selectedGroup.created_at).toLocaleDateString()}</Badge>
                          <Badge variant="outline" className="text-[10px]">{selectedGroup.subject_focus}</Badge>
                          <Badge variant="outline" className="text-[10px]">Code: {selectedGroup.join_code}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <GroupSettingsDialog group={selectedGroup} isAdmin={isAdmin} onUpdate={loadMyGroups} onDelete={() => { setSelectedGroup(null); loadMyGroups(); }} />
                        <Button variant="ghost" size="icon" onClick={leaveGroup} title="Leave Group"><LogOut className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-8 h-auto">
                    <TabsTrigger value="chat" className="text-[10px] sm:text-xs gap-0.5 py-2"><Send className="w-3 h-3" /><span className="hidden sm:inline">Chat</span></TabsTrigger>
                    <TabsTrigger value="meet" className="text-[10px] sm:text-xs gap-0.5 py-2"><Video className="w-3 h-3" /><span className="hidden sm:inline">Meet</span></TabsTrigger>
                    <TabsTrigger value="members" className="text-[10px] sm:text-xs gap-0.5 py-2"><Users className="w-3 h-3" /><span className="hidden sm:inline">Members</span></TabsTrigger>
                    <TabsTrigger value="progress" className="text-[10px] sm:text-xs gap-0.5 py-2"><BookOpen className="w-3 h-3" /><span className="hidden sm:inline">Progress</span></TabsTrigger>
                    <TabsTrigger value="leaderboard" className="text-[10px] sm:text-xs gap-0.5 py-2"><Trophy className="w-3 h-3" /><span className="hidden sm:inline">Board</span></TabsTrigger>
                    <TabsTrigger value="assignments" className="text-[10px] sm:text-xs gap-0.5 py-2"><ClipboardList className="w-3 h-3" /><span className="hidden sm:inline">Tasks</span></TabsTrigger>
                    <TabsTrigger value="calendar" className="text-[10px] sm:text-xs gap-0.5 py-2"><CalendarDays className="w-3 h-3" /><span className="hidden sm:inline">Calendar</span></TabsTrigger>
                    <TabsTrigger value="notifications" className="text-[10px] sm:text-xs gap-0.5 py-2"><Bell className="w-3 h-3" /><span className="hidden sm:inline">Alerts</span></TabsTrigger>
                  </TabsList>

                  {/* Chat */}
                  <TabsContent value="chat">
                    <Card>
                      <ScrollArea className="h-72 p-4">
                        {messages.map(m => (
                          <div key={m.id} className={`mb-3 ${m.user_id === user!.id ? "text-right" : ""}`}>
                            <p className="text-[10px] text-muted-foreground">{m.email}</p>
                            <div className={`inline-block px-3 py-2 rounded-lg text-sm max-w-[80%] ${m.user_id === user!.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                              {m.message}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </ScrollArea>
                      <div className="p-3 border-t border-border flex gap-2">
                        <Button variant="outline" size="icon" onClick={shareMyProgress} title="Share my progress"><Share2 className="w-4 h-4" /></Button>
                        <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && sendMessage()} className="flex-1" />
                        <Button size="icon" onClick={sendMessage}><Send className="w-4 h-4" /></Button>
                      </div>
                    </Card>
                  </TabsContent>

                  {/* Meet */}
                  <TabsContent value="meet">
                    <Card><CardContent className="pt-4">
                      {!meetActive ? (
                        <div className="flex flex-col items-center justify-center h-72 gap-4">
                          <Video className="w-12 h-12 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground text-center">Start a live video call with your group.<br />Room: <span className="font-mono font-bold text-foreground">StudyBuddy-{selectedGroup.join_code}</span></p>
                          <Button onClick={() => setMeetActive(true)} size="lg" className="gap-2"><Video className="w-4 h-4" />Start Meet</Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">Live Call — {selectedGroup.name}</p>
                              <p className="text-xs text-muted-foreground">Room: StudyBuddy-{selectedGroup.join_code}</p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => setMeetActive(false)}>Leave Call</Button>
                          </div>
                          <div className="rounded-lg overflow-hidden border border-border bg-black" style={{ height: "min(520px, 65vh)" }}>
                            <iframe
                              src={`https://meet.jit.si/StudyBuddy-${selectedGroup.join_code}#config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.toolbarButtons=["microphone","camera","desktop","fullscreen","hangup","chat","tileview","participants-pane","settings"]&config.disableDeepLinking=true&userInfo.displayName=${encodeURIComponent(userName)}`}
                              allow="camera; microphone; fullscreen; display-capture; autoplay; compute-pressure"
                              className="w-full h-full border-0"
                              title="Group Video Call"
                              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent></Card>
                  </TabsContent>

                  {/* Members */}
                  <TabsContent value="members">
                    <Card><CardContent className="pt-4 space-y-2">
                      {members.map(m => (
                        <div key={m.user_id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.display_name || m.email}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Joined {new Date(m.joined_at).toLocaleDateString()}</span>
                              <span>·</span>
                              <span>{m.total_hours || 0}h total</span>
                              <span>·</span>
                              <span>{m.xp || 0} XP</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {m.user_id === selectedGroup.created_by && <Badge variant="secondary" className="text-[10px]"><Crown className="w-3 h-3 mr-0.5" />Admin</Badge>}
                          </div>
                        </div>
                      ))}
                    </CardContent></Card>
                  </TabsContent>

                  {/* Progress */}
                  <TabsContent value="progress">
                    <Card><CardContent className="pt-4 space-y-4">
                      {members.map(m => (
                        <div key={m.user_id} className="space-y-2 p-3 rounded-lg bg-secondary/30">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{m.display_name || m.email}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] gap-1"><Flame className="w-3 h-3" />{m.streak || 0}d</Badge>
                              <Badge variant="outline" className="text-[10px] gap-1"><Clock className="w-3 h-3" />{m.total_hours || 0}h</Badge>
                            </div>
                          </div>
                          {m.subjects_progress && m.subjects_progress.length > 0 ? (
                            <div className="space-y-1.5">
                              {m.subjects_progress.map((s, i) => (
                                <div key={i}>
                                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">{s.code}</span><span className="text-foreground font-mono">{s.progress}%</span></div>
                                  <Progress value={s.progress} className="h-1.5" />
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-xs text-muted-foreground">No subjects yet</p>}
                        </div>
                      ))}
                      <GroupAchievements groupId={selectedGroup.id} members={members} />
                    </CardContent></Card>
                  </TabsContent>

                  {/* Leaderboard */}
                  <TabsContent value="leaderboard">
                    <Card><CardContent className="pt-4 space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Ranked by study hours this week</p>
                      {sortedByHours.map((m, i) => (
                        <div key={m.user_id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold w-6 text-muted-foreground">
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{m.display_name || m.email}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />{m.streak || 0}d streak</span>
                                <span>{m.xp || 0} XP</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground">{m.weekly_hours || 0}h</p>
                            <p className="text-[10px] text-muted-foreground">this week</p>
                          </div>
                        </div>
                      ))}
                    </CardContent></Card>
                  </TabsContent>

                  {/* Assignments */}
                  <TabsContent value="assignments">
                    <Card><CardContent className="pt-4">
                      <GroupAssignments groupId={selectedGroup.id} isAdmin={isAdmin} members={members} />
                    </CardContent></Card>
                  </TabsContent>

                  {/* Calendar */}
                  <TabsContent value="calendar">
                    <Card><CardContent className="pt-4">
                      <GroupCalendar groupId={selectedGroup.id} members={members} />
                    </CardContent></Card>
                  </TabsContent>

                  {/* Notifications */}
                  <TabsContent value="notifications">
                    <Card><CardContent className="pt-4">
                      <GroupNotifications groupId={selectedGroup.id} />
                    </CardContent></Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
