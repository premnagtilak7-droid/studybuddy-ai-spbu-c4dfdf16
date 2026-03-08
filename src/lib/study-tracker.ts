// Local study tracking for streak and last-studied
const STREAK_KEY = "sppu_study_dates";
const LAST_STUDIED_KEY = "sppu_last_studied";

export function recordStudySession() {
  const today = new Date().toISOString().split("T")[0];
  const dates = getStudyDates();
  if (!dates.includes(today)) {
    dates.push(today);
    localStorage.setItem(STREAK_KEY, JSON.stringify(dates));
  }
}

export function getStudyDates(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || "[]");
  } catch { return []; }
}

export function getStudyStreak(): number {
  const dates = getStudyDates().sort().reverse();
  if (dates.length === 0) return 0;
  
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let checkDate = new Date(today);
  
  // Allow today or yesterday as start
  if (dates[0] !== today) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (dates[0] !== checkDate.toISOString().split("T")[0]) return 0;
  }
  
  for (const d of dates) {
    const expected = checkDate.toISOString().split("T")[0];
    if (d === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}

export type LastStudied = {
  subjectId: string;
  subjectName: string;
  topicName: string;
  unitName: string;
  timestamp: number;
};

export function setLastStudied(info: LastStudied) {
  localStorage.setItem(LAST_STUDIED_KEY, JSON.stringify(info));
}

export function getLastStudied(): LastStudied | null {
  try {
    const raw = localStorage.getItem(LAST_STUDIED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
