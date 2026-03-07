import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Timetable from "./pages/Timetable";
import Subjects from "./pages/Subjects";
import SubjectManagement from "./pages/SubjectManagement";
import AISolver from "./pages/AISolver";
import StudyRoom from "./pages/StudyRoom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/subject-management" element={<SubjectManagement />} />
          <Route path="/ai-solver" element={<AISolver />} />
          <Route path="/study-room" element={<StudyRoom />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
