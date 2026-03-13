import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CalendarClock, Clock, CheckCircle2, ArrowRight, ArrowLeft, User, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    id: 0,
    title: "Set Up Your Profile",
    description: "Tell us what you're studying — school, college, competitive exam, or self-learning. We'll personalize everything for you.",
    icon: User,
    action: "/profile",
    actionLabel: "Set Up Profile",
  },
  {
    id: 1,
    title: "Add Your Subjects",
    description: "Add subjects manually or use our syllabus templates to get started instantly with pre-built topics and units.",
    icon: BookOpen,
    action: "/subject-management",
    actionLabel: "Add Subjects",
  },
  {
    id: 2,
    title: "Set Exam Dates",
    description: "Add your upcoming exam schedule. We'll calculate countdowns and warn you if you're falling behind.",
    icon: CalendarClock,
    action: "/exam-dates",
    actionLabel: "Set Dates",
  },
  {
    id: 3,
    title: "Build Your Timetable",
    description: "Create a weekly study timetable to stay consistent. We'll track your streaks and study sessions.",
    icon: Clock,
    action: "/timetable",
    actionLabel: "Create Timetable",
  },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const progressValue = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-0 overflow-hidden"
    >
      {/* Progress header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="px-6 pb-6"
        >
          <div className="flex flex-col items-center text-center py-6">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4">
              <step.icon className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{step.description}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>

            <div className="flex gap-2">
              {currentStep < steps.length - 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep((s) => s + 1)}
                >
                  Skip
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => navigate(step.action)}
                className="gap-1"
              >
                {step.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}