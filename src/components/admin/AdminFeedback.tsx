import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Filter, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Ticket = {
  id: string; user_id: string; user_email: string; subject: string;
  message: string; priority: string; status: string; admin_reply: string | null;
  replied_at: string | null; created_at: string;
};

type Props = { tickets: Ticket[]; onRefresh: () => void };

export default function AdminFeedback({ tickets, onRefresh }: Props) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const filtered = tickets.filter(t => filterStatus === "all" || t.status === filterStatus);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast.success(`Ticket marked as ${status}`);
    onRefresh();
  };

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return toast.error("Enter a reply");
    await supabase.from("support_tickets").update({
      admin_reply: replyText.trim(),
      replied_at: new Date().toISOString(),
      status: "in_progress",
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    toast.success("Reply sent");
    setReplyingTo(null);
    setReplyText("");
    onRefresh();
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "bg-destructive/20 text-destructive";
      case "high": return "bg-orange-500/20 text-orange-600";
      case "medium": return "bg-accent/20 text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "bg-blue-500/20 text-blue-600";
      case "in_progress": return "bg-accent/20 text-accent-foreground";
      case "resolved": return "bg-primary/20 text-primary";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["all", "open", "in_progress", "resolved"].map(s => (
          <div key={s} className="glass-card p-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
            onClick={() => setFilterStatus(s)}>
            <p className="text-2xl font-bold text-foreground">
              {s === "all" ? tickets.length : tickets.filter(t => t.status === s).length}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{s.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="glass-card p-3 flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {filtered.map(t => (
          <div key={t.id} className="glass-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">{t.subject}</p>
                <p className="text-xs text-muted-foreground font-mono">{t.user_email} · {new Date(t.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-1">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${priorityColor(t.priority)}`}>
                  {t.priority.toUpperCase()}
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusColor(t.status)}`}>
                  {t.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-xs text-foreground bg-secondary/50 p-3 rounded-lg">{t.message}</p>

            {t.admin_reply && (
              <div className="bg-primary/5 p-3 rounded-lg border-l-2 border-primary">
                <p className="text-[10px] text-muted-foreground mb-1">Admin Reply · {t.replied_at ? new Date(t.replied_at).toLocaleString() : ""}</p>
                <p className="text-xs text-foreground">{t.admin_reply}</p>
              </div>
            )}

            {replyingTo === t.id ? (
              <div className="space-y-2">
                <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." rows={2} className="text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => sendReply(t.id)}><Send className="w-3.5 h-3.5 mr-1" /> Send Reply</Button>
                  <Button size="sm" variant="outline" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setReplyingTo(t.id)}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Reply
                </Button>
                {t.status !== "resolved" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "resolved")}>Mark Resolved</Button>
                )}
                {t.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "in_progress")}>In Progress</Button>
                )}
                {t.status === "resolved" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(t.id, "open")}>Reopen</Button>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No tickets found</p>}
      </div>
    </motion.div>
  );
}
