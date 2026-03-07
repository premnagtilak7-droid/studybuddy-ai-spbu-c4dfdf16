export type UserSubject = {
  id: string;
  name: string;
  code: string;
  targetUnits: number;
  completedUnits: number;
  color: string;
};

const STORAGE_KEY = "sppu-subjects";

const DEFAULT_SUBJECTS: UserSubject[] = [
  { id: "1", name: "Basic Electrical Engineering", code: "BEE", targetUnits: 6, completedUnits: 3, color: "chart-1" },
  { id: "2", name: "Engineering Mechanics", code: "EM", targetUnits: 6, completedUnits: 2, color: "chart-2" },
  { id: "3", name: "Mathematics II", code: "M2", targetUnits: 6, completedUnits: 2, color: "chart-3" },
];

const COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

export function getSubjects(): UserSubject[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { /* fall through */ }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
  return DEFAULT_SUBJECTS;
}

export function saveSubjects(subjects: UserSubject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
}

export function addSubject(name: string, code: string, targetUnits: number): UserSubject[] {
  const subjects = getSubjects();
  const newSubject: UserSubject = {
    id: crypto.randomUUID(),
    name,
    code,
    targetUnits,
    completedUnits: 0,
    color: COLORS[subjects.length % COLORS.length],
  };
  const updated = [...subjects, newSubject];
  saveSubjects(updated);
  return updated;
}

export function updateSubject(id: string, data: Partial<Omit<UserSubject, "id">>): UserSubject[] {
  const subjects = getSubjects().map(s => s.id === id ? { ...s, ...data } : s);
  saveSubjects(subjects);
  return subjects;
}

export function deleteSubject(id: string): UserSubject[] {
  const subjects = getSubjects().filter(s => s.id !== id);
  saveSubjects(subjects);
  return subjects;
}
