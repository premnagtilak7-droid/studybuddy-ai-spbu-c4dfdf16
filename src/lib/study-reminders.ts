import { supabase } from "@/integrations/supabase/client";
import { sendToSW, hasNotificationPermission } from "./service-worker-manager";
import { showReminderBanner } from "@/components/ReminderBanner";
import { playReminderSound } from "./sounds";

export type StudyReminder = {
  id: string;
  user_id: string;
  subject_id: string | null;
  subject_name: string;
  reminder_time: string; // HH:MM
  is_active: boolean;
  created_at: string;
};

export async function getReminders(): Promise<StudyReminder[]> {
  const { data } = await supabase
    .from("study_reminders")
    .select("*")
    .order("reminder_time", { ascending: true });
  return (data || []) as StudyReminder[];
}

export async function addReminder(subjectId: string | null, subjectName: string, time: string): Promise<StudyReminder | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("study_reminders")
    .insert({ user_id: user.id, subject_id: subjectId, subject_name: subjectName, reminder_time: time })
    .select()
    .single();
  if (error) throw error;
  return data as StudyReminder;
}

export async function updateReminder(id: string, updates: Partial<Pick<StudyReminder, 'reminder_time' | 'is_active' | 'subject_name'>>): Promise<void> {
  await supabase.from("study_reminders").update(updates).eq("id", id);
}

export async function deleteReminder(id: string): Promise<void> {
  await supabase.from("study_reminders").delete().eq("id", id);
}

const MOTIVATIONAL = [
  "Stay focused and keep pushing! 💪",
  "Every session brings you closer to your goals! 🎯",
  "You're building something great! 🌟",
  "Discipline is the bridge between goals and results! 🔥",
];

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderChecker() {
  if (reminderInterval) return;
  checkReminders();
  reminderInterval = setInterval(checkReminders, 60000);
}

export function stopReminderChecker() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

async function checkReminders() {
  if (!hasNotificationPermission()) return;
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayKey = now.toISOString().split("T")[0];
  
  try {
    const reminders = await getReminders();
    for (const r of reminders) {
      if (!r.is_active) continue;
      if (r.reminder_time === currentTime) {
        const sentKey = `reminder_sent_${r.id}_${todayKey}`;
        if (!localStorage.getItem(sentKey)) {
          localStorage.setItem(sentKey, "1");
          const motivation = MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];

          // Play loud sound
          playReminderSound();

          // Show in-app banner with snooze
          showReminderBanner(r.subject_name, motivation);

          // Send push notification via service worker
          sendToSW({
            type: 'STUDY_REMINDER',
            data: { id: r.id, subjectName: r.subject_name, motivation }
          });
        }
      }
    }
  } catch {}
}
