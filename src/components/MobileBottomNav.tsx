import { NavLink, useLocation } from "react-router-dom";
import { Home, BookOpen, MessageSquare, Timer, User, Menu, X, Calendar, Sparkles, FileText, CheckCircle, Calculator, Target, TrendingUp, Trophy, Brain, Layers, BookMarked, ClipboardList, Award, FlaskConical, Users, Heart, Rss, Share2, Ban, BarChart3, Settings, HelpCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

const TABS = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: BookOpen, label: "Subjects", path: "/subjects" },
  { icon: MessageSquare, label: "AI", path: "/ai-solver" },
  { icon: Timer, label: "Timer", path: "/study-timer" },
  { icon: User, label: "Profile", path: "/profile" },
];

const MORE_SECTIONS: { title: string; items: { icon: any; label: string; path: string }[] }[] = [
  {
    title: "Main",
    items: [
      { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
      { icon: Calendar, label: "Timetable", path: "/timetable" },
      { icon: BookOpen, label: "Manage Subjects", path: "/subject-management" },
      { icon: Calendar, label: "Exam Dates", path: "/exam-dates" },
    ],
  },
  {
    title: "AI Tools",
    items: [
      { icon: Sparkles, label: "AI Study Plan", path: "/study-plan" },
      { icon: FileText, label: "AI Mock Test", path: "/mock-test" },
      { icon: CheckCircle, label: "Answer Checker", path: "/answer-checker" },
      { icon: Calculator, label: "Formula Sheet", path: "/formula-sheet" },
      { icon: Target, label: "Exam Predictor", path: "/exam-predictor" },
      { icon: TrendingUp, label: "Performance", path: "/performance" },
    ],
  },
  {
    title: "Study",
    items: [
      { icon: Layers, label: "Flashcards", path: "/flashcards" },
      { icon: BookMarked, label: "Formula Bank", path: "/formula-bank" },
      { icon: ClipboardList, label: "Assignments", path: "/assignments" },
      { icon: Award, label: "Marks & CGPA", path: "/marks" },
      { icon: FlaskConical, label: "Previous Year Papers", path: "/previous-year-papers" },
      { icon: Ban, label: "Blocked Apps", path: "/blocked-apps" },
      { icon: Brain, label: "Attendance", path: "/attendance" },
    ],
  },
  {
    title: "Community",
    items: [
      { icon: Users, label: "Study Groups", path: "/study-groups" },
      { icon: HelpCircle, label: "Doubt Forum", path: "/doubt-forum" },
      { icon: Heart, label: "Study Buddy", path: "/study-buddy" },
      { icon: Rss, label: "Batch Feed", path: "/batch-feed" },
      { icon: Share2, label: "Share Progress", path: "/share-progress" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: Settings, label: "Notifications", path: "/notifications" },
      { icon: Trophy, label: "Pricing", path: "/pricing" },
    ],
  },
];

const HIDDEN_ROUTES = ["/auth", "/forgot-password", "/reset-password", "/landing", "/", "/download", "/privacy", "/terms"];

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-stretch border-t"
        style={{
          height: "calc(64px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "rgba(8,8,15,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTopColor: "rgba(255,255,255,0.08)",
        }}
      >
        {TABS.map((t) => {
          const active = pathname === t.path || (t.path === "/dashboard" && pathname === "/");
          const Icon = t.icon;
          return (
            <NavLink
              key={t.path}
              to={t.path}
              className="flex-1 flex flex-col items-center justify-center gap-1 press"
              style={{ color: active ? "#818cf8" : "rgba(255,255,255,0.4)" }}
            >
              <Icon size={22} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{t.label}</span>
            </NavLink>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className="flex-1 flex flex-col items-center justify-center gap-1 press"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <Menu size={22} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>All features</SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-6 pb-10">
              {MORE_SECTIONS.map((section) => (
                <div key={section.title}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    {section.title}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {section.items.map((it) => {
                      const Icon = it.icon;
                      return (
                        <NavLink
                          key={it.path}
                          to={it.path}
                          onClick={() => setMoreOpen(false)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card/40 active:scale-95 transition"
                        >
                          <Icon size={20} className="text-primary" />
                          <span className="text-[11px] text-center text-foreground/80 leading-tight">{it.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
