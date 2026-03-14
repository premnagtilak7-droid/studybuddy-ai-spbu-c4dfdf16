import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, Clock, TestTube, History, ArrowLeft, BellOff, Info, Volume2, Sun, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { setSoundVolume, playSoundTest, initAudioContext } from "@/lib/sounds";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cardSlideIn, staggerItem } from "@/lib/animations";

const notifTypes: { key: keyof NotificationPreferences; label: string; emoji: string; desc: string }[] = [
  { key: "examCountdown", label: "Exam Countdown", emoji: "⏰", desc: "Alerts before upcoming exams" },
  { key: "streakAlert", label: "Streak Alerts", emoji: "🔥", desc: "Reminders to save your study streak" },
  { key: "timetableReminder", label: "Timetable Reminders", emoji: "📚", desc: "Before scheduled study sessions" },
  { key: "dailyStudyReminder", label: "Daily Study Reminder", emoji: "📖", desc: "If you haven't studied yet today" },
  { key: "studyGoalAlert", label: "Study Goal Alerts", emoji: "🎯", desc: "Progress towards your daily goal" },
  { key: "achievementUnlocked", label: "Achievement Unlocked", emoji: "🏆", desc: "When you earn a new badge" },
  { key: "examCountdownDays", label: "Exam Day Countdown", emoji: "📅", desc: "Alerts 7, 3, 1 days before exams" },
  { key: "morningReminderEnabled", label: "Morning Reminder", emoji: "☀️", desc: "Good morning with today's plan" },
];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPrefs());
  const [permission, setPermission] = useState(getPermissionStatus());
  const [history, setHistory] = useState(getNotificationHistory());
  const navigate = useNavigate();

  useEffect(() => { setPermission(getPermissionStatus()); }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  };

  const handleTimeChange = (key: "dailyReminderTime" | "streakAlertTime" | "morningReminderTime", value: string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    saveNotificationPrefs(updated);
  };

  const handleVolumeChange = (value: number[]) => {
    const vol = value[0];
    const updated = { ...prefs, soundVolume: vol };
    setPrefs(updated);
    saveNotificationPrefs(updated);
    setSoundVolume(vol);
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") toast.success("Notifications enabled!");
    else if (result === "denied") toast.error("Notifications blocked. Enable in browser settings.");
  };

  const handleTestNotification = () => {
    sendLocalNotification("🔔 Test Notification", "Notifications are working! You'll receive study reminders here.", "test");
    toast.success("Test notification sent!");
    setTimeout(() => setHistory(getNotificationHistory()), 500);
  };

  const handleSoundTest = () => {
    initAudioContext();
    playSoundTest();
    toast.success("Playing sound test — if you can't hear it, check your device volume.");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <motion.div {...cardSlideIn} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
            <p className="text-sm text-muted-foreground">Control how and when you receive alerts</p>
          </div>
        </motion.div>

        {/* Permission Status */}
        <motion.div {...cardSlideIn} transition={{ delay: 0.05 }} className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {permission === "granted" ? (
                <div className="p-2 rounded-lg bg-primary/10"><BellRing className="w-5 h-5 text-primary" /></div>
              ) : (
                <div className="p-2 rounded-lg bg-destructive/10"><BellOff className="w-5 h-5 text-destructive" /></div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {permission === "granted" ? "Notifications Enabled" : permission === "denied" ? "Notifications Blocked" : permission === "unsupported" ? "Not Supported" : "Notifications Not Enabled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {permission === "granted" ? "You'll receive push notifications for study reminders"
                    : permission === "denied" ? "Open browser settings to allow notifications"
                    : permission === "unsupported" ? "Your browser doesn't support notifications"
                    : "Allow notifications to get exam reminders and streak alerts"}
                </p>
              </div>
            </div>
            {permission !== "granted" && permission !== "unsupported" && (
              <Button size="sm" onClick={handleRequestPermission}>Enable</Button>
            )}
          </div>
        </motion.div>

        {/* Volume Control */}
        <motion.div {...cardSlideIn} transition={{ delay: 0.08 }} className="glass-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Volume2 className="w-4 h-4" /> Sound Volume
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">🔇</span>
            <Slider
              value={[prefs.soundVolume]}
              onValueChange={handleVolumeChange}
              min={0} max={1} step={0.05}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">🔊</span>
            <span className="text-xs font-mono text-foreground w-10 text-right">{Math.round(prefs.soundVolume * 100)}%</span>
          </div>
        </motion.div>

        {/* Sound Test */}
        <motion.div {...cardSlideIn} transition={{ delay: 0.09 }} className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Music className="w-5 h-5 text-accent" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">Test Sound</p>
                <p className="text-xs text-muted-foreground">Verify sounds play correctly on your device</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleSoundTest}>🔊 Play Test</Button>
          </div>
        </motion.div>

        {/* Notification Types */}
        <motion.div {...cardSlideIn} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-1">
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
        <motion.div {...cardSlideIn} transition={{ delay: 0.15 }} className="glass-card p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Notification Timing
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Daily Reminder</Label>
              <Input type="time" value={prefs.dailyReminderTime} onChange={(e) => handleTimeChange("dailyReminderTime", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Streak Alert</Label>
              <Input type="time" value={prefs.streakAlertTime} onChange={(e) => handleTimeChange("streakAlertTime", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Sun className="w-3 h-3" />Morning</Label>
              <Input type="time" value={prefs.morningReminderTime} onChange={(e) => handleTimeChange("morningReminderTime", e.target.value)} className="mt-1" />
            </div>
          </div>
        </motion.div>

        {/* Test Notification */}
        <motion.div {...cardSlideIn} transition={{ delay: 0.2 }} className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><TestTube className="w-5 h-5 text-accent" /></div>
              <div>
                <p className="text-sm font-medium text-foreground">Test Push Notification</p>
                <p className="text-xs text-muted-foreground">Send a test to verify push notifications work</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleTestNotification}>Send Test</Button>
          </div>
        </motion.div>

        {/* History */}
        <motion.div {...cardSlideIn} transition={{ delay: 0.25 }} className="glass-card p-4">
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
                <motion.div key={item.id} {...staggerItem} className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50">
                  <Bell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{format(new Date(item.timestamp), "MMM d, h:mm a")}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
