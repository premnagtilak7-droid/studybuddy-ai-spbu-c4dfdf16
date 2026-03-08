import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = { open: boolean; onClose: () => void };

export default function SupportTicketModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sending, setSending] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setMyTickets(data);
    setShowHistory(true);
  };

  const submit = async () => {
    if (!user || !subject.trim() || !message.trim()) return toast.error("Fill all fields");
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      user_email: user.email || "",
      subject: subject.trim(),
      message: message.trim(),
      priority,
    } as any);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket submitted! We'll get back to you soon.");
    setSubject(""); setMessage(""); setPriority("medium");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="glass-card p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-foreground">Help & Feedback</h3>
              <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            {!showHistory ? (
              <>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description..." />
                </div>
                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue or feedback..." rows={4} />
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={submit} disabled={sending} className="flex-1">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                    Submit Ticket
                  </Button>
                  <Button variant="outline" onClick={loadTickets}>My Tickets</Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowHistory(false)}>← New Ticket</Button>
                <div className="space-y-3">
                  {myTickets.map((t: any) => (
                    <div key={t.id} className="bg-secondary/50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-foreground text-sm">{t.subject}</p>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === "resolved" ? "bg-primary/20 text-primary" :
                          t.status === "in_progress" ? "bg-accent/20 text-accent-foreground" :
                          "bg-blue-500/20 text-blue-600"
                        }`}>{t.status.replace(/_/g, " ").toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.message}</p>
                      {t.admin_reply && (
                        <div className="bg-primary/5 p-2 rounded border-l-2 border-primary">
                          <p className="text-[10px] text-muted-foreground">Admin Reply:</p>
                          <p className="text-xs text-foreground">{t.admin_reply}</p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {myTickets.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No tickets yet</p>}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
