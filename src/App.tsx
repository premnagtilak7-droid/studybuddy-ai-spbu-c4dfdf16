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
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!isAdmin && user?.email !== "nagtilakprem99@gmail.com") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  useActivityTracker();
  return (
    <Routes>
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
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
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminConsole /></AdminRoute></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
