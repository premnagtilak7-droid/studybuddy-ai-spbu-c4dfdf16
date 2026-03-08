import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, BookOpen, CalendarClock, Calendar, Trophy, MessageSquare, ChevronLeft, ChevronRight, GraduationCap, Zap, Shield, LogOut, Flame, User, Sparkles, Loader2, HelpCircle, FileText, CheckCircle, Calculator, Target, Users, Heart, Share2, Rss, Layers, BookMarked, ClipboardList, Award, FlaskConical, Brain, Menu, X,
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

const navItems = [
  { icon: BarChart3, label: "Stats Center", path: "/" },
  { icon: Calendar, label: "Timetable", path: "/timetable" },
  { icon: BookOpen, label: "Subjects", path: "/subjects" },
  { icon: BookOpen, label: "Manage Subjects", path: "/subject-management" },
  { icon: MessageSquare, label: "AI Doubt Solver", path: "/ai-solver" },
  { icon: Sparkles, label: "AI Study Plan", path: "/study-plan" },
  { icon: FileText, label: "AI Mock Test", path: "/mock-test" },
  { icon: CheckCircle, label: "Answer Checker", path: "/answer-checker" },
  { icon: Calculator, label: "Formula Sheet", path: "/formula-sheet" },
  { icon: Target, label: "Exam Predictor", path: "/exam-predictor" },
  { icon: CalendarClock, label: "Exam Dates", path: "/exam-dates" },
  { icon: Trophy, label: "Study Room", path: "/study-room" },
  { icon: Users, label: "Study Groups", path: "/study-groups" },
  { icon: MessageSquare, label: "Doubt Forum", path: "/doubt-forum" },
  { icon: Heart, label: "Study Buddy", path: "/study-buddy" },
  { icon: Share2, label: "Share Progress", path: "/share-progress" },
  { icon: Rss, label: "Batch Feed", path: "/batch-feed" },
  { icon: Layers, label: "Flashcards", path: "/flashcards" },
  { icon: BookMarked, label: "Formula Bank", path: "/formula-bank" },
  { icon: ClipboardList, label: "Attendance", path: "/attendance" },
  { icon: Award, label: "Marks & CGPA", path: "/marks" },
  { icon: FlaskConical, label: "Assignments & Labs", path: "/assignments" },
  { icon: Brain, label: "Focus Mode", path: "/focus" },
  { icon: BellRing, label: "Notifications", path: "/notifications" },
];

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

  useEffect(() => {
    getUserXP().then(setXP);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        {(!collapsed || isMobile) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden flex-1">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">SPPU Study</h1>
            <p className="text-[10px] font-mono text-sidebar-foreground">2024 Pattern</p>
          </motion.div>
        )}
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div className="mx-2 mt-3 px-3 py-2 rounded-lg bg-sidebar-accent flex items-center gap-2">
          <Flame className="w-4 h-4 text-accent flex-shrink-0" />
          {(!collapsed || isMobile) && (
            <span className="text-xs font-mono text-sidebar-accent-foreground">{streak} day streak 🔥</span>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
              {isActive && (!collapsed || isMobile) && (
                <Zap className="w-3.5 h-3.5 ml-auto" />
              )}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
              location.pathname === "/admin"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isMobile) && <span>Admin Dashboard</span>}
            {location.pathname === "/admin" && (!collapsed || isMobile) && (
              <Zap className="w-3.5 h-3.5 ml-auto" />
            )}
          </Link>
        )}
      </nav>

      {/* Support Ticket Modal */}
      <SupportTicketModal open={showSupport} onClose={() => setShowSupport(false)} />

      {/* User profile dropdown, Sign Out & Collapse */}
      <div className="px-2 pb-4 space-y-1 border-t border-sidebar-border pt-3">
        {/* Help & Feedback */}
        <button
          onClick={() => setShowSupport(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm font-medium ${
            collapsed && !isMobile ? "justify-center" : ""
          }`}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Help & Feedback</span>}
        </button>
        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-left">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              {(!collapsed || isMobile) && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-sidebar-accent-foreground truncate flex items-center gap-1.5">
                    {user?.email}
                    {isAdmin && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/20 text-primary border-0">
                        Admin
                      </Badge>
                    )}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/60 flex items-center gap-1">
                    {level.emoji} {level.name} · {xp} XP
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
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/20 text-primary border-0">
                    Admin
                  </Badge>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">SPPU Study Account</p>
            </div>
            <DropdownMenuSeparator />
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="w-4 h-4" />
                    Admin Console
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/change-password" className="flex items-center gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                Change Password
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

        {/* Standalone Sign Out button */}
        <button
          onClick={() => setShowSignOutConfirm(true)}
          disabled={signingOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium disabled:opacity-50 ${
            collapsed && !isMobile ? "justify-center" : ""
          }`}
        >
          {signingOut ? <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" /> : <LogOut className="w-5 h-5 flex-shrink-0" />}
          {(!collapsed || isMobile) && <span>{signingOut ? "Signing out..." : "Sign Out"}</span>}
        </button>

        {/* Collapse toggle - desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex items-center justify-center"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-background border border-border shadow-sm"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 z-50"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {isMobile ? (
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-0 h-screen w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col z-50"
            >
              {sidebarContent}
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        <motion.aside
          animate={{ width: sidebarWidth }}
          transition={{ duration: 0.2 }}
          className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50"
        >
          {sidebarContent}
        </motion.aside>
      )}

      {/* Sign Out Confirmation Dialog */}
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
