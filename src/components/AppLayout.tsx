import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";
import type { ExamDate } from "@/lib/exam-store";

interface AppLayoutProps {
  children: ReactNode;
  examDates?: ExamDate[];
}

export default function AppLayout({ children, examDates }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-[260px] min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 h-14 flex items-center justify-end px-6 border-b border-border bg-background/80 backdrop-blur-sm">
          <NotificationBell examDates={examDates} />
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
