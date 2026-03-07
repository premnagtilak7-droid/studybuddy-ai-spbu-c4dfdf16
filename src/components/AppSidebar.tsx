import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  Calendar,
  Trophy,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Zap,
  Shield,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const baseNavItems = [
  { icon: BarChart3, label: "Stats Center", path: "/" },
  { icon: Calendar, label: "Timetable", path: "/timetable" },
  { icon: BookOpen, label: "Subjects", path: "/subjects" },
  { icon: BookOpen, label: "Manage Subjects", path: "/subject-management" },
  { icon: MessageSquare, label: "AI Doubt Solver", path: "/ai-solver" },
  { icon: Trophy, label: "Study Room", path: "/study-room" },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isAdmin, user, signOut } = useAuth();

  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: "Admin Console", path: "/admin" }]
    : baseNavItems;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">SPPU Study</h1>
            <p className="text-[10px] font-mono text-sidebar-foreground">2024 Pattern</p>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
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
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <Zap className="w-3.5 h-3.5 ml-auto" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Collapse */}
      <div className="px-2 pb-4 space-y-2">
        {user && !collapsed && (
          <div className="px-3 py-2 text-xs text-sidebar-foreground truncate font-mono">
            {user.email}
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          {!collapsed && (
            <button
              onClick={signOut}
              className="flex-1 flex items-center gap-2 p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
