import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, Clock, TestTube, History, ArrowLeft, BellOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  requestNotificationPermission,
  getPermissionStatus,
  sendLocalNotification,
  getNotificationHistory,
  type NotificationPreferences,
} from "@/lib/notifications";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const notifTypes: { key: keyof NotificationPreferences; label: string; emoji: string; desc: string }[] = [
  { key: "examCountdown", label: "Exam Countdown", emoji: "⏰", desc: "Alerts before upcoming exams" },
  { key: "streakAlert", label: "Streak Alerts", emoji: "🔥", desc: "Reminders to save your study streak" },
  { key: "timetableReminder", label: "Timetable Reminders", emoji: "📚", desc: "Before scheduled study sessions" },
  { key: "dailyStudyReminder", label: "Daily Study Reminder", emoji: "📖", desc: "If you haven't studied yet today" },
  { key: "studyGoalAlert", label: "Study Goal Alerts", emoji: "🎯", desc: "Progress towards your daily goal" },
  { key: "achievementUnlocked", label: "Achievement Unlocked", emoji: "🏆", desc: "When you earn a new badge" },
];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPrefs());
  const [permission, setPermission] = useState(getPermissionStatus());
  const [history, setHistory] = useState(getNotificationHistory());
  const navigate = useNavigate();

  useEffect(() => {
    setPermission(getPermissionStatus());
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  };

  const handleTimeChange = (key: "dailyReminderTime" | "streakAlertTime", value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("Notifications enabled!");
    } else if (result === "denied") {
      toast.error("Notifications blocked. Enable in browser settings.");
    }
  };

  const handleTestNotification = () => {
    sendLocalNotification(
      "🔔 Test Notification",
      "Notifications are working! You'll receive study reminders here.",
      "test"
    );
    toast.success("Test notification sent!");
    setTimeout(() => setHistory(getNotificationHistory()), 500);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
            <p className="text-sm text-muted-foreground">Control how and when you receive alerts</p>
          </div>
        </div>

        {/* Permission Status */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {permission === "granted" ? (
                <div className="p-2 rounded-lg bg-primary/10">
                  <BellRing className="w-5 h-5 text-primary" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-destructive/10">
                  <BellOff className="w-5 h-5 text-destructive" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {permission === "granted" ? "Notifications Enabled" : permission === "denied" ? "Notifications Blocked" : permission === "unsupported" ? "Not Supported" : "Notifications Not Enabled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {permission === "granted"
                    ? "You'll receive push notifications for study reminders"
                    : permission === "denied"
                    ? "Open browser settings to allow notifications"
                    : permission === "unsupported"
                    ? "Your browser doesn't support notifications"
                    : "Allow notifications to get exam reminders and streak alerts"}
                </p>
              </div>
            </div>
            {permission !== "granted" && permission !== "unsupported" && (
              <Button size="sm" onClick={handleRequestPermission}>Enable</Button>
            )}
          </div>
        </motion.div>

        {/* Notification Types */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4 space-y-1">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notification Types
          </h2>
          {notifTypes.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <Switch checked={!!prefs[item.key]} onCheckedChange={() => handleToggle(item.key)} />
            </div>
          ))}
        </motion.div>

        {/* Timing */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Notification Timing
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Daily Reminder Time</Label>
              <Input
                type="time"
                value={prefs.dailyReminderTime}
                onChange={(e) => handleTimeChange("dailyReminderTime", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Streak Alert Time</Label>
              <Input
                type="time"
                value={prefs.streakAlertTime}
                onChange={(e) => handleTimeChange("streakAlertTime", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </motion.div>

        {/* Test */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TestTube className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Test Notifications</p>
                <p className="text-xs text-muted-foreground">Send a test to verify they work</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleTestNotification}>
              Send Test
            </Button>
          </div>
        </motion.div>

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Recent Notifications
          </h2>
          {history.length === 0 ? (
            <div className="text-center py-6">
              <Info className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50">
                  <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(item.timestamp), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
