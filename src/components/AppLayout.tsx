import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import type { ExamDate } from "@/lib/exam-store";

interface AppLayoutProps {
  children: ReactNode;
  examDates?: ExamDate[];
}

const BREADCRUMB_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/timetable": "Timetable",
  "/subjects": "Subjects",
  "/subject-management": "Manage Subjects",
  "/ai-solver": "AI Doubt Solver",
  "/study-plan": "AI Study Plan",
  "/mock-test": "AI Mock Test",
  "/answer-checker": "Answer Checker",
  "/formula-sheet": "Formula Sheet",
  "/exam-predictor": "Exam Predictor",
  "/performance": "Performance",
  "/exam-dates": "Exam Dates",
  "/study-room": "Study Room",
  "/study-timer": "Study Timer",
  "/study-groups": "Study Groups",
  "/doubt-forum": "Doubt Forum",
  "/study-buddy": "Study Buddy",
  "/share-progress": "Share Progress",
  "/batch-feed": "Batch Feed",
  "/flashcards": "Flashcards",
  "/formula-bank": "Formula Bank",
  "/attendance": "Attendance",
  "/marks": "Marks & CGPA",
  "/assignments": "Assignments & Labs",
  "/focus": "Focus Mode",
  "/previous-year-papers": "Previous Year Papers",
  "/notifications": "Notifications",
  "/profile": "Profile",
  "/pricing": "Plans & Pricing",
  "/admin": "Admin Dashboard",
  "/privacy": "Privacy Policy",
  "/terms": "Terms & Conditions",
  "/change-password": "Change Password",
};

export default function AppLayout({ children, examDates }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();

  const currentPage = BREADCRUMB_MAP[location.pathname] || 
    (location.pathname.startsWith("/subject/") ? "Subject Detail" : "Page");

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <AppSidebar />
      <div className={`${isMobile ? "ml-0" : "ml-[260px]"} min-h-screen flex flex-col`}>
        <header className="sticky top-0 z-40 h-14 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border/50 bg-background/70 backdrop-blur-xl">
          {/* Breadcrumbs */}
          <nav className={`flex items-center gap-1.5 text-sm ${isMobile ? "ml-12" : ""}`}>
            <Home className="w-3.5 h-3.5 text-muted-foreground" />
            {location.pathname !== "/" && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className="font-medium text-foreground truncate max-w-[200px]">{currentPage}</span>
              </>
            )}
            {location.pathname === "/" && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className="font-medium text-foreground">Dashboard</span>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell examDates={examDates} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
