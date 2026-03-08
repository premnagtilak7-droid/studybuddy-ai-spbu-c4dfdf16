import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Plus, LogIn, Send, Trophy, Crown, Flame } from "lucide-react";

type Group = {
  id: string;
  name: string;
  subject_focus: string;
  max_members: number;
  join_code: string;
  created_by: string;
  created_at: string;
};

type Member = {
  user_id: string;
  joined_at: string;
  email?: string;
  display_name?: string;
  xp?: number;
  streak?: number;
};

type Message = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  email?: string;
};

export default function StudyGroups() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newGroup, setNewGroup] = useState({ name: "", subject_focus: "", max_members: 10 });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMyGroups(); }, []);
  useEffect(() => { if (selectedGroup) { loadMembers(); loadMessages(); } }, [selectedGroup]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime messages
  useEffect(() => {
    if (!selectedGroup) return;
    const channel = supabase.channel(`group-${selectedGroup.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${selectedGroup.id}` },
        (payload) => {
          const msg = payload.new as any;
          setMessages(prev => [...prev, { ...msg, email: "" }]);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup]);

  async function loadMyGroups() {
    const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user!.id);
    if (!memberships?.length) { setMyGroups([]); return; }
    const groupIds = memberships.map(m => m.group_id);
    const { data } = await supabase.from("study_groups").select("*").in("id", groupIds);
    setMyGroups((data || []) as Group[]);
  }

  async function loadMembers() {
    const { data } = await supabase.from("group_members").select("user_id, joined_at").eq("group_id", selectedGroup!.id);
    if (!data) return;
    const userIds = data.map(m => m.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, display_name").in("user_id", userIds);
    const { data: xpData } = await supabase.from("user_xp").select("user_id, total_xp").in("user_id", userIds);
    setMembers(data.map(m => {
      const p = profiles?.find(p => p.user_id === m.user_id);
      const x = xpData?.find(x => x.user_id === m.user_id);
      return { ...m, email: p?.email, display_name: p?.display_name, xp: x?.total_xp || 0 };
    }));
  }

  async function loadMessages() {
    const { data } = await supabase.from("group_messages").select("*").eq("group_id", selectedGroup!.id).order("created_at", { ascending: true }).limit(100);
    if (!data) return;
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
    const { error } = await supabase.from("group_members").insert({ group_id: (group as any).id, user_id: user!.id });
    if (error?.code === "23505") { toast.error("Already a member"); } else if (error) { toast.error("Failed to join"); } else { toast.success(`Joined ${(group as any).name}!`); loadMyGroups(); }
    setJoinCode("");
    setLoading(false);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedGroup) return;
    await supabase.from("group_messages").insert({ group_id: selectedGroup.id, user_id: user!.id, message: newMessage });
    setNewMessage("");
  }

  const sortedMembers = [...members].sort((a, b) => (b.xp || 0) - (a.xp || 0));

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Study Groups</h1>
            <p className="text-muted-foreground text-sm">Collaborate with your peers</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Create Group</Button></DialogTrigger>
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
              <Input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Join code" className="w-32" />
              <Button variant="outline" size="sm" onClick={joinGroup} disabled={loading}><LogIn className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">My Groups</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myGroups.length === 0 && <p className="text-muted-foreground text-xs">No groups yet. Create or join one!</p>}
              {myGroups.map(g => (
                <button key={g.id} onClick={() => setSelectedGroup(g)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedGroup?.id === g.id ? "bg-primary/10 border-primary" : "border-border hover:bg-muted"}`}>
                  <p className="font-medium text-sm text-foreground">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.subject_focus}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">Code: {g.join_code}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Main Area */}
          <div className="lg:col-span-2">
            {!selectedGroup ? (
              <Card className="h-96 flex items-center justify-center">
                <p className="text-muted-foreground">Select a group to view</p>
              </Card>
            ) : (
              <Tabs defaultValue="chat">
                <TabsList className="w-full"><TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger><TabsTrigger value="members" className="flex-1">Members</TabsTrigger><TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger></TabsList>
                <TabsContent value="chat">
                  <Card>
                    <ScrollArea className="h-80 p-4">
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
                      <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && sendMessage()} />
                      <Button size="icon" onClick={sendMessage}><Send className="w-4 h-4" /></Button>
                    </div>
                  </Card>
                </TabsContent>
                <TabsContent value="members">
                  <Card><CardContent className="pt-4 space-y-2">
                    {members.map(m => (
                      <div key={m.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.display_name || m.email}</p>
                          <p className="text-xs text-muted-foreground">{m.xp || 0} XP</p>
                        </div>
                        {m.user_id === selectedGroup.created_by && <Badge variant="secondary"><Crown className="w-3 h-3 mr-1" />Owner</Badge>}
                      </div>
                    ))}
                  </CardContent></Card>
                </TabsContent>
                <TabsContent value="leaderboard">
                  <Card><CardContent className="pt-4 space-y-2">
                    {sortedMembers.map((m, i) => (
                      <div key={m.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.display_name || m.email}</p>
                          </div>
                        </div>
                        <Badge>{m.xp || 0} XP</Badge>
                      </div>
                    ))}
                  </CardContent></Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
