const REMINDERS_KEY = "sppu_session_reminders";
const STORAGE_KEY = "sppu_timetable_sessions";

export type ReminderEntry = {
  sessionId: string;
  day: string;
  minutesBefore: number;
  timeoutId?: number;
};

type Session = {
  id: string;
  subject: string;
  topic: string;
  time: string;
  duration: string;
  completed: boolean;
};

type Schedule = Record<string, Session[]>;

function getReminders(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveReminders(r: Record<string, number>) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(r));
}

export function getReminder(sessionId: string): number | null {
  const reminders = getReminders();
  return reminders[sessionId] ?? null;
}

export function setReminder(sessionId: string, minutesBefore: number) {
  const reminders = getReminders();
  reminders[sessionId] = minutesBefore;
  saveReminders(reminders);
}

export function clearReminder(sessionId: string) {
  const reminders = getReminders();
  delete reminders[sessionId];
  saveReminders(reminders);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function toMinutesFromMidnight(timeStr: string): number {
  const [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

const activeTimeouts = new Map<string, number>();

export function scheduleAllReminders() {
  // Clear existing
  activeTimeouts.forEach((id) => clearTimeout(id));
  activeTimeouts.clear();

  const reminders = getReminders();
  let schedule: Schedule;
  try {
    schedule = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return;
  }

  const now = new Date();
  const todayDayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySessions = schedule[todayDayName] || [];

  for (const session of todaySessions) {
    const minutesBefore = reminders[session.id];
    if (minutesBefore == null || session.completed) continue;

    const sessionMin = toMinutesFromMidnight(session.time);
    const reminderMin = sessionMin - minutesBefore;
    const delayMs = (reminderMin - nowMinutes) * 60 * 1000;

    if (delayMs > 0) {
      const timeoutId = window.setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification(`📚 Study Reminder`, {
            body: `${session.subject}${session.topic ? ` — ${session.topic}` : ""} starts in ${minutesBefore} minutes!`,
            icon: "/favicon.ico",
          });
        }
      }, delayMs);
      activeTimeouts.set(session.id, timeoutId);
    }
  }
}

// Timetable daily progress helpers
export type TimetableDayProgress = {
  totalSessions: number;
  completedSessions: number;
  totalHours: number;
  completedHours: number;
};

function parseDuration(d: string): number {
  if (d.endsWith("min")) return parseInt(d) / 60;
  return parseFloat(d.replace("h", ""));
}

export function getTodayTimetableProgress(): TimetableDayProgress {
  let schedule: Schedule;
  try {
    schedule = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return { totalSessions: 0, completedSessions: 0, totalHours: 0, completedHours: 0 };
  }

  const todayDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const sessions = schedule[todayDayName] || [];

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s: any) => s.completed).length;
  const totalHours = sessions.reduce((a: number, s: any) => a + parseDuration(s.duration || "0"), 0);
  const completedHours = sessions
    .filter((s: any) => s.completed)
    .reduce((a: number, s: any) => a + parseDuration(s.duration || "0"), 0);

  return { totalSessions, completedSessions, totalHours, completedHours };
}
