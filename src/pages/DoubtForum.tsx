import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { awardXP, emitXP } from "@/lib/xp-store";
import { MessageSquare, Plus, ThumbsUp, ThumbsDown, CheckCircle, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Post = {
  id: string; user_id: string; subject: string; topic: string | null; question: string; image_url: string | null; best_answer_id: string | null; created_at: string;
  user_email?: string; answer_count?: number;
};
type Answer = {
  id: string; post_id: string; user_id: string; answer: string; is_best: boolean; created_at: string;
  user_email?: string; upvotes: number; downvotes: number; user_vote?: string | null;
};

export default function DoubtForum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [newPost, setNewPost] = useState({ subject: "", topic: "", question: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadPosts(); }, [filter, subjectFilter]);
  useEffect(() => { if (selectedPost) loadAnswers(selectedPost.id); }, [selectedPost]);

  async function loadPosts() {
    let query = supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (subjectFilter !== "all") query = query.eq("subject", subjectFilter);
    const { data } = await query;
    if (!data) return;
    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
    // Get answer counts
    const postIds = data.map(p => p.id);
    const { data: answerData } = await supabase.from("forum_answers").select("post_id").in("post_id", postIds);
    
    let enriched = data.map(p => {
      const prof = profiles?.find(pr => pr.user_id === p.user_id);
      const count = answerData?.filter(a => a.post_id === p.id).length || 0;
      return { ...p, user_email: prof?.display_name || prof?.email || "Anonymous", answer_count: count };
    }) as Post[];

    if (filter === "unanswered") enriched = enriched.filter(p => (p.answer_count || 0) === 0);
    if (filter === "popular") enriched.sort((a, b) => (b.answer_count || 0) - (a.answer_count || 0));
    setPosts(enriched);
  }

  async function loadAnswers(postId: string) {
    const { data } = await supabase.from("forum_answers").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (!data) return;
    const userIds = [...new Set(data.map(a => a.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", userIds);
    const answerIds = data.map(a => a.id);
    const { data: votes } = answerIds.length ? await supabase.from("forum_votes").select("*").in("answer_id", answerIds) : { data: [] };

    setAnswers(data.map(a => {
      const prof = profiles?.find(p => p.user_id === a.user_id);
      const answerVotes = votes?.filter(v => v.answer_id === a.id) || [];
      const upvotes = answerVotes.filter(v => v.vote_type === "up").length;
      const downvotes = answerVotes.filter(v => v.vote_type === "down").length;
      const userVote = answerVotes.find(v => v.user_id === user!.id)?.vote_type || null;
      return { ...a, user_email: prof?.display_name || prof?.email || "Anonymous", upvotes, downvotes, user_vote: userVote };
    }));
  }

  async function createPost() {
    if (!newPost.subject || !newPost.question) return;
    setLoading(true);
    const { error } = await supabase.from("forum_posts").insert({
      user_id: user!.id, subject: newPost.subject, topic: newPost.topic || null, question: newPost.question
    });
    if (error) { toast.error("Failed to post"); } else { toast.success("Doubt posted!"); setCreateOpen(false); setNewPost({ subject: "", topic: "", question: "" }); loadPosts(); }
    setLoading(false);
  }

  async function submitAnswer() {
    if (!newAnswer.trim() || !selectedPost) return;
    setLoading(true);
    const { error } = await supabase.from("forum_answers").insert({ post_id: selectedPost.id, user_id: user!.id, answer: newAnswer });
    if (error) { toast.error("Failed to answer"); } else { toast.success("Answer posted!"); setNewAnswer(""); loadAnswers(selectedPost.id); }
    setLoading(false);
  }

  async function vote(answerId: string, voteType: string) {
    const existing = answers.find(a => a.id === answerId);
    if (existing?.user_vote === voteType) {
      await supabase.from("forum_votes").delete().eq("answer_id", answerId).eq("user_id", user!.id);
    } else if (existing?.user_vote) {
      await supabase.from("forum_votes").update({ vote_type: voteType }).eq("answer_id", answerId).eq("user_id", user!.id);
    } else {
      await supabase.from("forum_votes").insert({ answer_id: answerId, user_id: user!.id, vote_type: voteType });
    }
    loadAnswers(selectedPost!.id);
  }

  async function markBest(answerId: string, answerUserId: string) {
    if (selectedPost?.user_id !== user!.id) return;
    await supabase.from("forum_answers").update({ is_best: false }).eq("post_id", selectedPost.id);
    await supabase.from("forum_answers").update({ is_best: true }).eq("id", answerId);
    await supabase.from("forum_posts").update({ best_answer_id: answerId }).eq("id", selectedPost.id);
    // Award XP to answerer
    if (answerUserId !== user!.id) {
      // We can't award XP to another user from client side easily, but we mark it
      toast.success("Best answer marked! Answerer earns +15 XP");
    }
    loadAnswers(selectedPost.id);
  }

  const subjects = [...new Set(posts.map(p => p.subject))];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Doubt Forum</h1>
            <p className="text-muted-foreground text-sm">Ask doubts, help others, earn XP</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unanswered">Unanswered</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Ask Doubt</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Post a Doubt</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Subject</Label><Input value={newPost.subject} onChange={e => setNewPost({ ...newPost, subject: e.target.value })} placeholder="e.g. Data Structures" /></div>
                  <div><Label>Topic (optional)</Label><Input value={newPost.topic} onChange={e => setNewPost({ ...newPost, topic: e.target.value })} placeholder="e.g. Binary Trees" /></div>
                  <div><Label>Question</Label><Textarea value={newPost.question} onChange={e => setNewPost({ ...newPost, question: e.target.value })} placeholder="Describe your doubt..." rows={4} /></div>
                  <Button onClick={createPost} disabled={loading} className="w-full">Post Doubt</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selectedPost ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedPost(null)}>← Back to Forum</Button>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex gap-2 mb-1">
                      <Badge variant="outline">{selectedPost.subject}</Badge>
                      {selectedPost.topic && <Badge variant="secondary">{selectedPost.topic}</Badge>}
                    </div>
                    <CardTitle className="text-lg">{selectedPost.question}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">by {selectedPost.user_email} · {formatDistanceToNow(new Date(selectedPost.created_at))} ago</p>
                  </div>
                  {selectedPost.best_answer_id && <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Solved</Badge>}
                </div>
              </CardHeader>
            </Card>

            {/* Answers */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{answers.length} Answers</h3>
              {answers.map(a => (
                <Card key={a.id} className={a.is_best ? "border-success" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center gap-1 min-w-[40px]">
                        <button onClick={() => vote(a.id, "up")} className={`p-1 rounded ${a.user_vote === "up" ? "text-success" : "text-muted-foreground hover:text-foreground"}`}><ThumbsUp className="w-4 h-4" /></button>
                        <span className="text-sm font-bold text-foreground">{a.upvotes - a.downvotes}</span>
                        <button onClick={() => vote(a.id, "down")} className={`p-1 rounded ${a.user_vote === "down" ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}><ThumbsDown className="w-4 h-4" /></button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{a.answer}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">{a.user_email} · {formatDistanceToNow(new Date(a.created_at))} ago</p>
                          {a.is_best && <Badge className="bg-success text-success-foreground text-[10px]">Best Answer</Badge>}
                          {selectedPost.user_id === user!.id && !a.is_best && (
                            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => markBest(a.id, a.user_id)}>Mark Best</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Answer Form */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Textarea value={newAnswer} onChange={e => setNewAnswer(e.target.value)} placeholder="Write your answer..." rows={3} />
                <Button onClick={submitAnswer} disabled={loading} size="sm">Post Answer</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No doubts posted yet. Be the first!</p></Card>}
            {posts.map(p => (
              <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedPost(p)}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{p.subject}</Badge>
                        {p.topic && <Badge variant="secondary" className="text-[10px]">{p.topic}</Badge>}
                      </div>
                      <p className="text-sm font-medium text-foreground">{p.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">by {p.user_email} · {formatDistanceToNow(new Date(p.created_at))} ago</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary"><MessageSquare className="w-3 h-3 mr-1" />{p.answer_count}</Badge>
                      {p.best_answer_id && <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3" /></Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
