import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Send, Clock, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

type Notification = {
  id: string; title: string; message: string; target: string;
  target_email: string | null; scheduled_at: string | null;
  sent_at: string | null; is_sent: boolean; template_type: string | null;
  created_at: string;
};

type Props = { notifications: Notification[]; onRefresh: () => void };

const TEMPLATES = [
  { type: "exam_reminder", title: "📝 Exam Reminder", message: "Your exam is approaching! Make sure to review your study plan and complete all pending topics." },
  { type: "new_feature", title: "🚀 New Feature Available", message: "We've added exciting new features to help you study better. Check them out now!" },
  { type: "subscription_expiry", title: "⚠️ Subscription Expiring Soon", message: "Your premium subscription is expiring soon. Renew now to continue enjoying all premium features." },
  { type: "study_reminder", title: "📚 Time to Study!", message: "Don't break your study streak! Log in and complete at least one study session today." },
];

export default function AdminNotifications({ notifications, onRefresh }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [targetEmail, setTargetEmail] = useState("");
  const [scheduleType, setScheduleType] = useState("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const applyTemplate = (type: string) => {
    const t = TEMPLATES.find(t => t.type === type);
    if (t) { setTitle(t.title); setMessage(t.message); }
  };

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) return toast.error("Fill title and message");
    if (target === "specific" && !targetEmail.trim()) return toast.error("Enter target email");

    const { error } = await supabase.from("admin_notifications").insert({
      title: title.trim(),
      message: message.trim(),
      target,
      target_email: target === "specific" ? targetEmail.trim() : null,
      scheduled_at: scheduleType === "later" ? scheduledAt : null,
      is_sent: scheduleType === "now",
      sent_at: scheduleType === "now" ? new Date().toISOString() : null,
      created_by: user?.id,
    } as any);
    if (error) return toast.error(error.message);
    toast.success(scheduleType === "now" ? "Notification sent!" : "Notification scheduled!");
    setTitle(""); setMessage(""); setTargetEmail(""); setScheduledAt("");
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Composer */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notification Composer
        </h3>

        {/* Templates */}
        <div>
          <Label className="text-xs">Quick Templates</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TEMPLATES.map(t => (
              <Button key={t.type} variant="outline" size="sm" onClick={() => applyTemplate(t.type)} className="text-xs">
                <FileText className="w-3 h-3 mr-1" /> {t.type.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title..." />
          </div>
          <div>
            <Label className="text-xs">Target</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="premium">Premium Only</SelectItem>
                <SelectItem value="free">Free Only</SelectItem>
                <SelectItem value="specific">Specific Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {target === "specific" && (
          <div>
            <Label className="text-xs">Target Email</Label>
            <Input value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder="user@example.com" />
          </div>
        )}

        <div>
          <Label className="text-xs">Message</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write notification message..." rows={3} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Send Timing</Label>
            <Select value={scheduleType} onValueChange={setScheduleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Send Now</SelectItem>
                <SelectItem value="later">Schedule for Later</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scheduleType === "later" && (
            <div>
              <Label className="text-xs">Schedule Date & Time</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            </div>
          )}
        </div>

        {/* Preview */}
        {previewMode && title && (
          <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-1">Preview:</p>
            <p className="font-semibold text-foreground text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{message}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-2">Target: {target}{target === "specific" ? ` (${targetEmail})` : ""}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={sendNotification}>
            {scheduleType === "now" ? <Send className="w-4 h-4 mr-1" /> : <Clock className="w-4 h-4 mr-1" />}
            {scheduleType === "now" ? "Send Now" : "Schedule"}
          </Button>
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="w-4 h-4 mr-1" /> {previewMode ? "Hide Preview" : "Preview"}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="glass-card overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notification History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Target</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(n => (
                <tr key={n.id} className="border-b border-border/50">
                  <td className="p-3 text-xs font-medium text-foreground">{n.title}</td>
                  <td className="p-3 text-xs text-muted-foreground capitalize">{n.target}{n.target_email ? ` (${n.target_email})` : ""}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {n.sent_at ? new Date(n.sent_at).toLocaleString() : n.scheduled_at ? `Scheduled: ${new Date(n.scheduled_at).toLocaleString()}` : "—"}
                  </td>
                  <td className="p-3">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      n.is_sent ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent-foreground"
                    }`}>{n.is_sent ? "SENT" : "SCHEDULED"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {notifications.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No notifications sent yet</p>}
      </div>
    </motion.div>
  );
}
