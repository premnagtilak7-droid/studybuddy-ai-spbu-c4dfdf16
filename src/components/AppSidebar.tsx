import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, BookOpen, CalendarClock, Calendar, Trophy, MessageSquare, ChevronLeft, ChevronRight, GraduationCap, Zap, Shield, LogOut, Flame, User, Sparkles, Loader2, HelpCircle, FileText, CheckCircle, Calculator, Target, Users, Heart, Share2, Rss, Layers, BookMarked, ClipboardList, Award, FlaskConical, Brain, Menu, X, Timer, TrendingUp, Ban,
} from "lucide-react";
import { BellRing } from "lucide-react";
import SupportTicketModal from "./SupportTicketModal";
import { useAuth } from "@/contexts/AuthContext";
import { getStudyStreak } from "@/lib/study-tracker";
import { getUserXP, getLevel } from "@/lib/xp-store";
import { ThemeToggle } from "./ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      { icon: BarChart3, label: "Dashboard", path: "/dashboard" },
      { icon: Calendar, label: "Timetable", path: "/timetable" },
      { icon: BookOpen, label: "Subjects", path: "/subjects" },
      { icon: BookOpen, label: "Manage Subjects", path: "/subject-management" },
    ],
  },
  {
    title: "AI Tools",
    items: [
      { icon: MessageSquare, label: "AI Doubt Solver", path: "/ai-solver" },
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
      { icon: CalendarClock, label: "Exam Dates", path: "/exam-dates" },
      { icon: Timer, label: "Study Timer", path: "/study-timer" },
      { icon: Ban, label: "Blocked Apps", path: "/blocked-apps" },
    ],
  },
  {
    title: "Social",
    items: [
      { icon: Users, label: "Study Groups", path: "/study-groups" },
      { icon: MessageSquare, label: "Doubt Forum", path: "/doubt-forum" },
      { icon: Heart, label: "Study Buddy", path: "/study-buddy" },
      { icon: Share2, label: "Share Progress", path: "/share-progress" },
      { icon: Rss, label: "Batch Feed", path: "/batch-feed" },
    ],
  },
  {
    title: "Tools",
    items: [
      { icon: Layers, label: "Flashcards", path: "/flashcards" },
      { icon: BookMarked, label: "Formula Bank", path: "/formula-bank" },
      { icon: ClipboardList, label: "Attendance", path: "/attendance" },
      { icon: Award, label: "Marks & CGPA", path: "/marks" },
      { icon: FlaskConical, label: "Assignments", path: "/assignments" },
      { icon: FileText, label: "Past Papers", path: "/previous-year-papers" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: BellRing, label: "Notifications", path: "/notifications" },
      { icon: User, label: "My Profile", path: "/profile" },
      { icon: GraduationCap, label: "Plans & Pricing", path: "/pricing" },
    ],
  },
];

const SCROLL_KEY = "sidebar_scroll_pos";

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, user, signOut } = useAuth();
  const streak = getStudyStreak();
  const [xp, setXP] = useState(0);
  const isMobile = useIsMobile();
  const navRef = useRef<HTMLElement>(null);
  const scrollRestoredRef = useRef(false);

  useEffect(() => { getUserXP().then(setXP); }, []);

  // Close mobile sidebar on navigation, but preserve scroll
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Restore scroll position after render
  useEffect(() => {
    if (navRef.current && !scrollRestoredRef.current) {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) {
        navRef.current.scrollTop = parseInt(saved, 10);
      }
      scrollRestoredRef.current = true;
    }
  });

  // Save scroll position on scroll
  const handleNavScroll = useCallback(() => {
    if (navRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(navRef.current.scrollTop));
    }
  }, []);

  const level = getLevel(xp);

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    setSigningOut(true);
    try {
      await signOut();
      const keysToRemove = ["study-tracker", "daily-goal", "sppu_timetable_sessions", "sppu_strict_mode", "sppu_timetable_visited"];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      navigate("/auth", { replace: true });
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      setSigningOut(false);
    }
  };

  const sidebarWidth = collapsed ? 72 : 260;
  const showLabel = !collapsed || isMobile;

  const sidebarContent = (
    <div className="flex flex-col h-full gradient-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border/50 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg glow-primary">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        {showLabel && (
          <div className="overflow-hidden flex-1">
            <h1 className="text-sm font-extrabold text-sidebar-accent-foreground tracking-tight">StudyBuddy</h1>
            <p className="text-[10px] font-mono text-sidebar-foreground/50">AI Study Companion</p>
          </div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Streak + XP mini */}
      {showLabel && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${streak > 0 ? "animate-fire-glow" : ""}`}>🔥</span>
              <span className="text-xs font-bold text-sidebar-accent-foreground">{streak}d</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold font-mono text-accent">{xp} XP</span>
            </div>
          </div>
        </div>
      )}

      {/* Nav Sections - scroll preserved */}
      <nav
        ref={navRef}
        onScroll={handleNavScroll}
        className="flex-1 py-3 px-2 space-y-4 overflow-y-auto scrollbar-stable"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {showLabel && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 text-sm font-medium relative ${
                      isActive
                        ? "bg-sidebar-primary/15 text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                    {showLabel && (
                      <span className={`truncate ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {isAdmin && (
          <div>
            {showLabel && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Admin</p>
            )}
            <Link
              to="/admin"
              className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 text-sm font-medium relative ${
                location.pathname === "/admin"
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              {location.pathname === "/admin" && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-primary"
                />
              )}
              <Shield className="w-[18px] h-[18px] flex-shrink-0" />
              {showLabel && <span>Admin Dashboard</span>}
            </Link>
          </div>
        )}
      </nav>

      <SupportTicketModal open={showSupport} onClose={() => setShowSupport(false)} />

      {/* Bottom section */}
      <div className="px-2 pb-3 space-y-1 border-t border-sidebar-border/30 pt-3 flex-shrink-0">
        <button
          onClick={() => setShowSupport(true)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors duration-150 text-sm font-medium ${
            collapsed && !isMobile ? "justify-center" : ""
          }`}
        >
          <HelpCircle className="w-[18px] h-[18px] flex-shrink-0" />
          {showLabel && <span>Help & Feedback</span>}
        </button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors duration-150 text-left">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/30">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-sidebar" />
              </div>
              {showLabel && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-sidebar-accent-foreground truncate flex items-center gap-1.5">
                    {user?.email?.split("@")[0]}
                    {isAdmin && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-primary/20 text-primary border-0">
                        Admin
                      </Badge>
                    )}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/50 flex items-center gap-1">
                    {level.emoji} {level.name}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                {user?.email}
                {isAdmin && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/20 text-primary border-0">Admin</Badge>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">StudyBuddy Account</p>
            </div>
            <DropdownMenuSeparator />
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="w-4 h-4" /> Admin Console
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/change-password" className="flex items-center gap-2 cursor-pointer">
                <User className="w-4 h-4" /> Change Password
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center justify-between cursor-default focus:bg-transparent" onSelect={e => e.preventDefault()}>
              <span className="text-sm">Theme</span>
              <ThemeToggle />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSignOutConfirm(true)} disabled={signingOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
              {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {signingOut ? "Signing out..." : "Sign Out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setShowSignOutConfirm(true)}
          disabled={signingOut}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors duration-150 text-sm font-medium disabled:opacity-50 ${
            collapsed && !isMobile ? "justify-center" : ""
          }`}
        >
          {signingOut ? <Loader2 className="w-[18px] h-[18px] animate-spin flex-shrink-0" /> : <LogOut className="w-[18px] h-[18px] flex-shrink-0" />}
          {showLabel && <span>{signingOut ? "Signing out..." : "Sign Out"}</span>}
        </button>

        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full p-2 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors duration-150 flex items-center justify-center"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );

  // On mobile, the bottom nav replaces the sidebar entirely
  if (isMobile) return null;

  return (
    <>

      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {isMobile ? (
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="fixed left-0 top-0 h-screen w-[280px] border-r border-sidebar-border/30 flex flex-col z-50 shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        <motion.aside
          animate={{ width: sidebarWidth }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed left-0 top-0 h-screen border-r border-sidebar-border/30 flex flex-col z-50"
        >
          {sidebarContent}
        </motion.aside>
      )}

      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? Your study data is safely stored and will be available when you sign back in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
