export type PlanType = "free" | "pro" | "elite";

export interface PlanInfo {
  name: string;
  price: number; // INR per month
  priceLabel: string;
  features: string[];
  limits: {
    maxSubjects: number;
    maxUnitsPerSubject: number;
  };
  color: string;
  popular?: boolean;
}

export const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    name: "Free",
    price: 0,
    priceLabel: "₹0/mo",
    color: "muted",
    limits: { maxSubjects: 2, maxUnitsPerSubject: 3 },
    features: [
      "Up to 2 subjects, 3 units each",
      "Basic stopwatch timer",
      "Basic timetable view",
      "Dashboard overview",
    ],
  },
  pro: {
    name: "Pro",
    price: 149,
    priceLabel: "₹149/mo",
    color: "primary",
    popular: true,
    limits: { maxSubjects: Infinity, maxUnitsPerSubject: Infinity },
    features: [
      "Unlimited subjects & units",
      "All timer modes (Stopwatch, Countdown, Pomodoro)",
      "AI Doubt Solver",
      "AI Study Plan Generator",
      "AI Mock Tests",
      "Subtopics tracking",
      "Full timetable & calendar",
      "Study reminders & push notifications",
      "Analytics & study heatmap",
      "Badges & achievements",
      "Background timer",
    ],
  },
  elite: {
    name: "Elite",
    price: 299,
    priceLabel: "₹299/mo",
    color: "accent",
    limits: { maxSubjects: Infinity, maxUnitsPerSubject: Infinity },
    features: [
      "Everything in Pro, plus:",
      "Study Groups with video call",
      "Friend system (Study Buddy)",
      "AI Formula Sheet",
      "AI Exam Predictor",
      "AI Answer Checker",
      "Marks & CGPA tracker",
      "Doubt Forum",
      "Share Progress",
      "Batch Feed",
      "Flashcard Maker",
      "Formula Bank",
      "Attendance Tracker",
      "Assignments & Labs tracker",
      "Focus Mode",
      "Offline mode & PWA install",
    ],
  },
};

// Map feature/route to minimum plan required
export type FeatureKey =
  | "ai_solver" | "study_plan" | "mock_test" | "answer_checker"
  | "formula_sheet" | "exam_predictor" | "study_groups" | "study_buddy"
  | "doubt_forum" | "share_progress" | "batch_feed" | "flashcards"
  | "formula_bank" | "attendance" | "marks" | "assignments"
  | "focus_mode" | "subtopics" | "pomodoro" | "countdown"
  | "reminders" | "heatmap" | "badges" | "analytics"
  | "unlimited_subjects" | "full_timetable";

export const FEATURE_PLAN_MAP: Record<FeatureKey, PlanType> = {
  // Pro features
  ai_solver: "pro",
  study_plan: "pro",
  mock_test: "pro",
  subtopics: "pro",
  pomodoro: "pro",
  countdown: "pro",
  reminders: "pro",
  heatmap: "pro",
  badges: "pro",
  analytics: "pro",
  unlimited_subjects: "pro",
  full_timetable: "pro",

  // Elite features
  answer_checker: "elite",
  formula_sheet: "elite",
  exam_predictor: "elite",
  study_groups: "elite",
  study_buddy: "elite",
  doubt_forum: "elite",
  share_progress: "elite",
  batch_feed: "elite",
  flashcards: "elite",
  formula_bank: "elite",
  attendance: "elite",
  marks: "elite",
  assignments: "elite",
  focus_mode: "elite",
};

// Route to feature key mapping
export const ROUTE_FEATURE_MAP: Record<string, FeatureKey> = {
  "/ai-solver": "ai_solver",
  "/study-plan": "study_plan",
  "/mock-test": "mock_test",
  "/answer-checker": "answer_checker",
  "/formula-sheet": "formula_sheet",
  "/exam-predictor": "exam_predictor",
  "/study-groups": "study_groups",
  "/study-buddy": "study_buddy",
  "/doubt-forum": "doubt_forum",
  "/share-progress": "share_progress",
  "/batch-feed": "batch_feed",
  "/flashcards": "flashcards",
  "/formula-bank": "formula_bank",
  "/attendance": "attendance",
  "/marks": "marks",
  "/assignments": "assignments",
  "/focus": "focus_mode",
};

const PLAN_HIERARCHY: Record<PlanType, number> = { free: 0, pro: 1, elite: 2 };

export function hasAccess(userPlan: PlanType, requiredPlan: PlanType): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}

export function canAccessFeature(userPlan: PlanType, feature: FeatureKey): boolean {
  const required = FEATURE_PLAN_MAP[feature];
  if (!required) return true;
  return hasAccess(userPlan, required);
}

export function getRequiredPlanForFeature(feature: FeatureKey): PlanType {
  return FEATURE_PLAN_MAP[feature] || "free";
}
