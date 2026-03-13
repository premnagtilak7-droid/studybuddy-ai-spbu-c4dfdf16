// Notification preferences stored in localStorage
export interface NotificationPreferences {
  examCountdown: boolean;
  streakAlert: boolean;
  timetableReminder: boolean;
  dailyStudyReminder: boolean;
  studyGoalAlert: boolean;
  achievementUnlocked: boolean;
  dailyReminderTime: string; // HH:MM
  streakAlertTime: string; // HH:MM
  morningReminderEnabled: boolean;
  morningReminderTime: string; // HH:MM
  examCountdownDays: boolean; // 7/3/1 day alerts
  soundVolume: number; // 0-1
}

const PREFS_KEY = "sppu_notification_prefs";
const HISTORY_KEY = "sppu_notification_history";

export const defaultPrefs: NotificationPreferences = {
  examCountdown: true,
  streakAlert: true,
  timetableReminder: true,
  dailyStudyReminder: true,
  studyGoalAlert: true,
  achievementUnlocked: true,
  dailyReminderTime: "09:00",
  streakAlertTime: "21:00",
  morningReminderEnabled: true,
  morningReminderTime: "07:00",
  examCountdownDays: true,
  soundVolume: 0.8,
};

export function getNotificationPrefs(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) return { ...defaultPrefs, ...JSON.parse(stored) };
  } catch {}
  return { ...defaultPrefs };
}

export function saveNotificationPrefs(prefs: NotificationPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  // Sync volume to sound system
  try {
    localStorage.setItem("sppu_sound_volume", String(prefs.soundVolume));
  } catch {}
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  type: string;
  timestamp: number;
}

export function getNotificationHistory(): NotificationRecord[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function addToHistory(record: NotificationRecord) {
  const history = getNotificationHistory();
  history.unshift(record);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const alreadyAsked = localStorage.getItem("notif_permission_asked");
  if (alreadyAsked) return Notification.permission;
  const result = await Notification.requestPermission();
  localStorage.setItem("notif_permission_asked", "1");
  return result;
}

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function sendLocalNotification(title: string, body: string, type: string, soundFn?: () => void) {
  const prefs = getNotificationPrefs();

  const typeMap: Record<string, keyof NotificationPreferences> = {
    exam: "examCountdown",
    streak: "streakAlert",
    timetable: "timetableReminder",
    daily: "dailyStudyReminder",
    goal: "studyGoalAlert",
    achievement: "achievementUnlocked",
  };

  const prefKey = typeMap[type];
  if (prefKey && !prefs[prefKey]) return;

  addToHistory({ id: crypto.randomUUID(), title, body, type, timestamp: Date.now() });

  // Play sound — use provided fn or default
  if (soundFn) {
    soundFn();
  } else {
    const { playNotificationSound } = await import("./sounds");
    playNotificationSound();
  }

  // Show browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) {
        reg.showNotification(title, {
          body, icon: "/pwa-192x192.png", badge: "/pwa-192x192.png",
          tag: type, requireInteraction: true, vibrate: [200, 100, 200, 100, 200],
        });
      } else {
        new Notification(title, { body, icon: "/pwa-192x192.png" });
      }
    } catch {
      new Notification(title, { body, icon: "/pwa-192x192.png" });
    }
  }
}

const MOTIVATIONAL = [
  "You've got this! 💪",
  "Consistency beats intensity. Keep going! 🔥",
  "Every minute counts towards your goals! ⏱️",
  "Champions are made in practice sessions! 🏆",
  "Your future self will thank you! 🌟",
  "Small steps, big results! 📈",
];

function randomMotivation() {
  return MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
}

// Schedule check - call this periodically or on app load
export async function checkAndSendScheduledNotifications() {
  const prefs = getNotificationPrefs();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayKey = now.toISOString().split("T")[0];

  // Daily reminder
  if (prefs.dailyStudyReminder && currentTime === prefs.dailyReminderTime) {
    const sentKey = `notif_daily_${todayKey}`;
    if (!localStorage.getItem(sentKey)) {
      localStorage.setItem(sentKey, "1");
      const { playReminderSound } = await import("./sounds");
      sendLocalNotification("Hey! Time to study 📚", `You haven't studied today yet. ${randomMotivation()}`, "daily", playReminderSound);
      // Also show in-app banner
      const { showReminderBanner } = await import("@/components/ReminderBanner");
      showReminderBanner("Daily Study", randomMotivation());
    }
  }

  // Morning reminder
  if (prefs.morningReminderEnabled && currentTime === prefs.morningReminderTime) {
    const sentKey = `notif_morning_${todayKey}`;
    if (!localStorage.getItem(sentKey)) {
      localStorage.setItem(sentKey, "1");
      const dayName = now.toLocaleDateString("en", { weekday: "long" });
      const { playReminderSound } = await import("./sounds");
      sendLocalNotification(
        `☀️ Good Morning!`,
        `Happy ${dayName}! Time to crush your study goals today. ${randomMotivation()}`,
        "daily",
        playReminderSound
      );
    }
  }

  // Streak alert
  if (prefs.streakAlert && currentTime === prefs.streakAlertTime) {
    const sentKey = `notif_streak_${todayKey}`;
    if (!localStorage.getItem(sentKey)) {
      localStorage.setItem(sentKey, "1");
      sendLocalNotification("🔥 Save your streak!", "Complete 1 topic to keep your streak alive tonight!", "streak");
    }
  }

  // Exam countdown alerts (7, 3, 1 days before)
  if (prefs.examCountdownDays) {
    await checkExamCountdownAlerts(todayKey);
  }
}

async function checkExamCountdownAlerts(todayKey: string) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: exams } = await supabase.from("exam_dates").select("exam_date, label").gte("exam_date", todayKey);
    if (!exams) return;
    const today = new Date();
    for (const exam of exams) {
      const examDate = new Date(exam.exam_date);
      const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if ([7, 3, 1].includes(daysUntil)) {
        const sentKey = `notif_exam_${exam.exam_date}_${daysUntil}d`;
        if (!localStorage.getItem(sentKey)) {
          localStorage.setItem(sentKey, "1");
          const { playReminderSound } = await import("./sounds");
          const label = exam.label || "Exam";
          sendLocalNotification(
            `⏰ ${label} in ${daysUntil} day${daysUntil > 1 ? "s" : ""}!`,
            `Your ${label} is ${daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}. Time to intensify your preparation! ${randomMotivation()}`,
            "exam",
            playReminderSound
          );
        }
      }
    }
  } catch {}
}
