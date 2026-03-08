import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ExamDate } from "@/lib/exam-store";

interface AppLayoutProps {
  children: ReactNode;
  examDates?: ExamDate[];
}

export default function AppLayout({ children, examDates }: AppLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className={`${isMobile ? "ml-0" : "ml-[260px]"} min-h-screen flex flex-col`}>
        <header className="sticky top-0 z-40 h-14 flex items-center justify-end gap-2 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <ThemeToggle />
          <NotificationBell examDates={examDates} />
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
