import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://studybuddy-ai-spbu.lovable.app";

type Meta = { title: string; description: string };

const ROUTE_META: Record<string, Meta> = {
  "/": {
    title: "StudyBuddy — AI Study Companion for Students",
    description: "AI-powered study dashboard with smart doubt solver, mock tests, study plans, flashcards and progress tracking.",
  },
  "/auth": {
    title: "Sign In or Sign Up — StudyBuddy",
    description: "Log in or create your StudyBuddy account to access your AI study companion.",
  },
  "/forgot-password": {
    title: "Forgot Password — StudyBuddy",
    description: "Reset your StudyBuddy account password securely via email.",
  },
  "/reset-password": {
    title: "Reset Password — StudyBuddy",
    description: "Set a new password for your StudyBuddy account.",
  },
  "/change-password": {
    title: "Change Password — StudyBuddy",
    description: "Update your StudyBuddy account password from your profile.",
  },
  "/timetable": {
    title: "Timetable — StudyBuddy",
    description: "Plan your weekly classes with a drag-and-drop timetable synced across devices.",
  },
  "/subjects": {
    title: "My Subjects — StudyBuddy",
    description: "Track all your subjects, units and topics with smart spaced-repetition revision.",
  },
  "/subject-management": {
    title: "Manage Subjects — StudyBuddy",
    description: "Add, edit, and organize your semester subjects and units.",
  },
  "/ai-solver": {
    title: "AI Doubt Solver — StudyBuddy",
    description: "Get step-by-step AI explanations for any academic doubt, tailored to your syllabus.",
  },
  "/study-plan": {
    title: "AI Study Plan Generator — StudyBuddy",
    description: "Generate a personalized study schedule with AI and export it as a PDF.",
  },
  "/study-room": {
    title: "Study Room — StudyBuddy",
    description: "Focused virtual study room with timers and progress tracking.",
  },
  "/study-timer": {
    title: "Study Timer — StudyBuddy",
    description: "Background-accurate study timer with Pomodoro and deep-work modes.",
  },
  "/exam-dates": {
    title: "Exam Dates & Countdown — StudyBuddy",
    description: "Track upcoming exams with countdown widgets and urgent reminders.",
  },
  "/mock-test": {
    title: "AI Mock Test — StudyBuddy",
    description: "Take timed AI-generated MCQ and theory mock tests with automatic scoring.",
  },
  "/answer-checker": {
    title: "AI Answer Checker — StudyBuddy",
    description: "Get your written answers graded against the SPPU 2024 pattern with detailed feedback.",
  },
  "/formula-sheet": {
    title: "AI Formula Sheet — StudyBuddy",
    description: "Generate unit-wise formula sheets with one click and export to PDF.",
  },
  "/exam-predictor": {
    title: "AI Exam Predictor — StudyBuddy",
    description: "Predict likely exam questions based on previous papers and your syllabus.",
  },
  "/performance": {
    title: "Performance Analysis — StudyBuddy",
    description: "Analyze mock test gaps, CGPA trends and target marks with AI insights.",
  },
  "/study-groups": {
    title: "Study Groups — StudyBuddy",
    description: "Join live group study sessions with classmates via Jitsi-powered rooms.",
  },
  "/doubt-forum": {
    title: "Doubt Forum — StudyBuddy",
    description: "Ask and answer academic doubts with the StudyBuddy student community.",
  },
  "/study-buddy": {
    title: "Find a Study Buddy — StudyBuddy",
    description: "Match with classmates who share your subjects and study goals.",
  },
  "/share-progress": {
    title: "Share Progress — StudyBuddy",
    description: "Generate beautiful branded progress cards to share your study streaks.",
  },
  "/batch-feed": {
    title: "Batch Feed — StudyBuddy",
    description: "See updates and announcements from your classmates and study batch.",
  },
  "/flashcards": {
    title: "Flashcard Maker — StudyBuddy",
    description: "Create and review subject flashcards with spaced repetition built in.",
  },
  "/formula-bank": {
    title: "Formula Bank — StudyBuddy",
    description: "Curated bank of important formulas for engineering subjects.",
  },
  "/attendance": {
    title: "Attendance Tracker — StudyBuddy",
    description: "Track lecture attendance and never fall below the 75% mark.",
  },
  "/marks": {
    title: "Marks & CGPA Tracker — StudyBuddy",
    description: "Log internal marks, calculate CGPA and predict target scores.",
  },
  "/assignments": {
    title: "Assignments & Labs — StudyBuddy",
    description: "Manage assignment deadlines, lab submissions and reminders.",
  },
  "/focus": {
    title: "Focus Mode — StudyBuddy",
    description: "Distraction-free focus timers from 25 to 90 minutes with a built-in notepad.",
  },
  "/previous-year-papers": {
    title: "Previous Year Papers (2020–2024) — StudyBuddy",
    description: "Practice SPPU previous year question papers as timed mocks with solutions.",
  },
  "/notifications": {
    title: "Notification Settings — StudyBuddy",
    description: "Configure study reminders, exam alerts and morning summaries.",
  },
  "/profile": {
    title: "My Profile — StudyBuddy",
    description: "Manage your account, education details and subscription.",
  },
  "/pricing": {
    title: "Plans & Pricing — StudyBuddy",
    description: "Compare Free, Pro and Elite plans. Start a 7-day free trial today.",
  },
  "/privacy": {
    title: "Privacy Policy — StudyBuddy",
    description: "Read how StudyBuddy collects, stores and protects your personal data.",
  },
  "/terms": {
    title: "Terms & Conditions — StudyBuddy",
    description: "Review the terms of service for using the StudyBuddy platform.",
  },
  "/admin": {
    title: "Admin Console — StudyBuddy",
    description: "Internal admin dashboard.",
  },
};

const FALLBACK: Meta = {
  title: "StudyBuddy — AI Study Companion",
  description: "AI-powered study companion for engineering and exam prep students.",
};

function upsertMeta(selector: string, attr: string, name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function RouteSEO() {
  const { pathname } = useLocation();

  useEffect(() => {
    const base = ROUTE_META[pathname];
    const meta = base ?? (pathname.startsWith("/subject/")
      ? { title: "Subject Detail — StudyBuddy", description: "View units, topics and progress for this subject." }
      : FALLBACK);

    const url = `${BASE_URL}${pathname}`;
    document.title = meta.title;
    upsertMeta('meta[name="description"]', "name", "description", meta.description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", meta.title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", meta.description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", meta.title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", meta.description);
    upsertCanonical(url);
  }, [pathname]);

  return null;
}
