import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useTrialCheck } from "@/hooks/useTrialCheck";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { setupGlobalErrorHandlers } from "@/lib/error-logger";
import { initAudioContext } from "@/lib/sounds";

// Preload critical pages immediately
const Index = lazy(() => import("./pages/Index"));
const Subjects = lazy(() => import("./pages/Subjects"));
const StudyTimer = lazy(() => import("./pages/StudyTimer"));

// Lazy load remaining pages
const Timetable = lazy(() => import("./pages/Timetable"));
const SubjectManagement = lazy(() => import("./pages/SubjectManagement"));
const SubjectDetail = lazy(() => import("./pages/SubjectDetail"));
const AISolver = lazy(() => import("./pages/AISolver"));
const StudyRoom = lazy(() => import("./pages/StudyRoom"));
const StudyPlanGenerator = lazy(() => import("./pages/StudyPlanGenerator"));
const ExamDates = lazy(() => import("./pages/ExamDates"));
const AdminConsole = lazy(() => import("./pages/AdminConsole"));
const AIMockTest = lazy(() => import("./pages/AIMockTest"));
const AIAnswerChecker = lazy(() => import("./pages/AIAnswerChecker"));
const AIFormulaSheet = lazy(() => import("./pages/AIFormulaSheet"));
const AIExamPredictor = lazy(() => import("./pages/AIExamPredictor"));
const AIPerformanceAnalysis = lazy(() => import("./pages/AIPerformanceAnalysis"));
const StudyGroups = lazy(() => import("./pages/StudyGroups"));
const DoubtForum = lazy(() => import("./pages/DoubtForum"));
const StudyBuddy = lazy(() => import("./pages/StudyBuddy"));
const ShareProgress = lazy(() => import("./pages/ShareProgress"));
const BatchFeed = lazy(() => import("./pages/BatchFeed"));
const FlashcardMaker = lazy(() => import("./pages/FlashcardMaker"));
const FormulaBank = lazy(() => import("./pages/FormulaBank"));
const AttendanceTracker = lazy(() => import("./pages/AttendanceTracker"));
const MarksTracker = lazy(() => import("./pages/MarksTracker"));
const AssignmentTracker = lazy(() => import("./pages/AssignmentTracker"));
const FocusMode = lazy(() => import("./pages/FocusMode"));
const PreviousYearPapers = lazy(() => import("./pages/PreviousYearPapers"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Profile = lazy(() => import("./pages/Profile"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));

import { GatedRoute } from "./components/GatedRoute";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import NotificationPermissionBanner from "./components/NotificationPermissionBanner";
import ReminderBanner from "./components/ReminderBanner";
import CookieConsent from "./components/CookieConsent";
import PageLoader from "./components/PageLoader";
import RouteSEO from "./components/RouteSEO";

// Preload critical pages after initial render
function usePreloadPages() {
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./pages/Index");
      import("./pages/Subjects");
      import("./pages/StudyTimer");
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <BanCheck>{children}</BanCheck>;
}

function BanCheck({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    if (!user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("profiles").select("is_banned, ban_reason").eq("user_id", user.id).single().then(({ data }) => {
        if (data?.is_banned) {
          setBanned(true);
          signOut();
        }
      });
    });
  }, [user, signOut]);

  if (banned) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-xl font-bold text-destructive">Account Suspended</h2>
          <p className="text-sm text-muted-foreground">Your account has been suspended. Contact support for assistance.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isAdmin && user?.email !== "nagtilakprem99@gmail.com") return <Navigate to="/" replace />;
  return children;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

const AppRoutes = () => {
  useActivityTracker();
  useTrialCheck();
  usePreloadPages();

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handler = () => {
      initAudioContext();
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
    document.addEventListener("click", handler, { once: false });
    document.addEventListener("touchstart", handler, { once: false });
    document.addEventListener("keydown", handler, { once: false });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
        <Route path="/subject-management" element={<ProtectedRoute><SubjectManagement /></ProtectedRoute>} />
        <Route path="/subject/:id" element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>} />
        <Route path="/ai-solver" element={<ProtectedRoute><GatedRoute feature="ai_solver" featureName="AI Doubt Solver"><AISolver /></GatedRoute></ProtectedRoute>} />
        <Route path="/study-plan" element={<ProtectedRoute><GatedRoute feature="study_plan" featureName="AI Study Plan"><StudyPlanGenerator /></GatedRoute></ProtectedRoute>} />
        <Route path="/study-room" element={<ProtectedRoute><StudyRoom /></ProtectedRoute>} />
        <Route path="/exam-dates" element={<ProtectedRoute><ExamDates /></ProtectedRoute>} />
        <Route path="/mock-test" element={<ProtectedRoute><GatedRoute feature="mock_test" featureName="AI Mock Test"><AIMockTest /></GatedRoute></ProtectedRoute>} />
        <Route path="/answer-checker" element={<ProtectedRoute><GatedRoute feature="answer_checker" featureName="AI Answer Checker"><AIAnswerChecker /></GatedRoute></ProtectedRoute>} />
        <Route path="/formula-sheet" element={<ProtectedRoute><GatedRoute feature="formula_sheet" featureName="AI Formula Sheet"><AIFormulaSheet /></GatedRoute></ProtectedRoute>} />
        <Route path="/exam-predictor" element={<ProtectedRoute><GatedRoute feature="exam_predictor" featureName="AI Exam Predictor"><AIExamPredictor /></GatedRoute></ProtectedRoute>} />
        <Route path="/performance" element={<ProtectedRoute><AIPerformanceAnalysis /></ProtectedRoute>} />
        <Route path="/study-groups" element={<ProtectedRoute><GatedRoute feature="study_groups" featureName="Study Groups"><StudyGroups /></GatedRoute></ProtectedRoute>} />
        <Route path="/doubt-forum" element={<ProtectedRoute><GatedRoute feature="doubt_forum" featureName="Doubt Forum"><DoubtForum /></GatedRoute></ProtectedRoute>} />
        <Route path="/study-buddy" element={<ProtectedRoute><GatedRoute feature="study_buddy" featureName="Study Buddy"><StudyBuddy /></GatedRoute></ProtectedRoute>} />
        <Route path="/share-progress" element={<ProtectedRoute><GatedRoute feature="share_progress" featureName="Share Progress"><ShareProgress /></GatedRoute></ProtectedRoute>} />
        <Route path="/batch-feed" element={<ProtectedRoute><GatedRoute feature="batch_feed" featureName="Batch Feed"><BatchFeed /></GatedRoute></ProtectedRoute>} />
        <Route path="/flashcards" element={<ProtectedRoute><GatedRoute feature="flashcards" featureName="Flashcard Maker"><FlashcardMaker /></GatedRoute></ProtectedRoute>} />
        <Route path="/formula-bank" element={<ProtectedRoute><GatedRoute feature="formula_bank" featureName="Formula Bank"><FormulaBank /></GatedRoute></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><GatedRoute feature="attendance" featureName="Attendance Tracker"><AttendanceTracker /></GatedRoute></ProtectedRoute>} />
        <Route path="/marks" element={<ProtectedRoute><GatedRoute feature="marks" featureName="Marks & CGPA"><MarksTracker /></GatedRoute></ProtectedRoute>} />
        <Route path="/assignments" element={<ProtectedRoute><GatedRoute feature="assignments" featureName="Assignments & Labs"><AssignmentTracker /></GatedRoute></ProtectedRoute>} />
        <Route path="/focus" element={<ProtectedRoute><GatedRoute feature="focus_mode" featureName="Focus Mode"><FocusMode /></GatedRoute></ProtectedRoute>} />
        <Route path="/study-timer" element={<ProtectedRoute><StudyTimer /></ProtectedRoute>} />
        <Route path="/previous-year-papers" element={<ProtectedRoute><PreviousYearPapers /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminConsole /></AdminRoute></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <RouteSEO />
              <AppRoutes />
              <PWAInstallPrompt />
              <NotificationPermissionBanner />
              <ReminderBanner />
              <CookieConsent />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
