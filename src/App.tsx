import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import Index from "./pages/Index";
import Timetable from "./pages/Timetable";
import Subjects from "./pages/Subjects";
import SubjectManagement from "./pages/SubjectManagement";
import SubjectDetail from "./pages/SubjectDetail";
import AISolver from "./pages/AISolver";
import StudyRoom from "./pages/StudyRoom";
import StudyPlanGenerator from "./pages/StudyPlanGenerator";
import ExamDates from "./pages/ExamDates";
import AdminConsole from "./pages/AdminConsole";
import AIMockTest from "./pages/AIMockTest";
import AIAnswerChecker from "./pages/AIAnswerChecker";
import AIFormulaSheet from "./pages/AIFormulaSheet";
import AIExamPredictor from "./pages/AIExamPredictor";
import StudyGroups from "./pages/StudyGroups";
import DoubtForum from "./pages/DoubtForum";
import StudyBuddy from "./pages/StudyBuddy";
import ShareProgress from "./pages/ShareProgress";
import BatchFeed from "./pages/BatchFeed";
import FlashcardMaker from "./pages/FlashcardMaker";
import FormulaBank from "./pages/FormulaBank";
import AttendanceTracker from "./pages/AttendanceTracker";
import MarksTracker from "./pages/MarksTracker";
import AssignmentTracker from "./pages/AssignmentTracker";
import FocusMode from "./pages/FocusMode";
import StudyTimer from "./pages/StudyTimer";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import NotificationSettings from "./pages/NotificationSettings";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground animate-pulse">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground animate-pulse">Loading...</p></div>;
  if (!isAdmin && user?.email !== "nagtilakprem99@gmail.com") return <Navigate to="/" replace />;
  return children;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

import { useTrialCheck } from "@/hooks/useTrialCheck";

const AppRoutes = () => {
  useActivityTracker();
  useTrialCheck();
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
      <Route path="/subject-management" element={<ProtectedRoute><SubjectManagement /></ProtectedRoute>} />
      <Route path="/subject/:id" element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>} />
      <Route path="/ai-solver" element={<ProtectedRoute><AISolver /></ProtectedRoute>} />
      <Route path="/study-plan" element={<ProtectedRoute><StudyPlanGenerator /></ProtectedRoute>} />
      <Route path="/study-room" element={<ProtectedRoute><StudyRoom /></ProtectedRoute>} />
      <Route path="/exam-dates" element={<ProtectedRoute><ExamDates /></ProtectedRoute>} />
      <Route path="/mock-test" element={<ProtectedRoute><AIMockTest /></ProtectedRoute>} />
      <Route path="/answer-checker" element={<ProtectedRoute><AIAnswerChecker /></ProtectedRoute>} />
      <Route path="/formula-sheet" element={<ProtectedRoute><AIFormulaSheet /></ProtectedRoute>} />
      <Route path="/exam-predictor" element={<ProtectedRoute><AIExamPredictor /></ProtectedRoute>} />
      <Route path="/study-groups" element={<ProtectedRoute><StudyGroups /></ProtectedRoute>} />
      <Route path="/doubt-forum" element={<ProtectedRoute><DoubtForum /></ProtectedRoute>} />
      <Route path="/study-buddy" element={<ProtectedRoute><StudyBuddy /></ProtectedRoute>} />
      <Route path="/share-progress" element={<ProtectedRoute><ShareProgress /></ProtectedRoute>} />
      <Route path="/batch-feed" element={<ProtectedRoute><BatchFeed /></ProtectedRoute>} />
      <Route path="/flashcards" element={<ProtectedRoute><FlashcardMaker /></ProtectedRoute>} />
      <Route path="/formula-bank" element={<ProtectedRoute><FormulaBank /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><AttendanceTracker /></ProtectedRoute>} />
      <Route path="/marks" element={<ProtectedRoute><MarksTracker /></ProtectedRoute>} />
      <Route path="/assignments" element={<ProtectedRoute><AssignmentTracker /></ProtectedRoute>} />
      <Route path="/focus" element={<ProtectedRoute><FocusMode /></ProtectedRoute>} />
      <Route path="/study-timer" element={<ProtectedRoute><StudyTimer /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminConsole /></AdminRoute></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

import PWAInstallPrompt from "./components/PWAInstallPrompt";
import NotificationPermissionBanner from "./components/NotificationPermissionBanner";
import ReminderBanner from "./components/ReminderBanner";
import { AnimatePresence } from "framer-motion";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <PWAInstallPrompt />
          <NotificationPermissionBanner />
          <ReminderBanner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
