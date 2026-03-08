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
  // Keep only last 20
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function sendLocalNotification(title: string, body: string, type: string) {
  const prefs = getNotificationPrefs();

  // Check if this type is enabled
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

  // Record in history
  addToHistory({
    id: crypto.randomUUID(),
    title,
    body,
    type,
    timestamp: Date.now(),
  });

  // Play notification sound
  playNotificationSound();

  // Show browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) {
        reg.showNotification(title, {
          body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          tag: type,
        });
      } else {
        new Notification(title, { body, icon: "/pwa-192x192.png" });
      }
    } catch {
      new Notification(title, { body, icon: "/pwa-192x192.png" });
    }
  }
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

// Schedule check - call this periodically or on app load
export function checkAndSendScheduledNotifications() {
  const prefs = getNotificationPrefs();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayKey = now.toISOString().split("T")[0];

  // Daily reminder
  if (prefs.dailyStudyReminder && currentTime === prefs.dailyReminderTime) {
    const sentKey = `notif_daily_${todayKey}`;
    if (!localStorage.getItem(sentKey)) {
      localStorage.setItem(sentKey, "1");
      sendLocalNotification("Hey! Time to study 📚", "You haven't studied today yet. Open the app and start a session!", "daily");
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
}
