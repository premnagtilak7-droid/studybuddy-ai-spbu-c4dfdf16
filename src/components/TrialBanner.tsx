import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function TrialBanner() {
  const { user, isSubscribed } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || isSubscribed) return;
    supabase
      .from("profiles")
      .select("trial_end, is_trial_active")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data && (data as any).is_trial_active && (data as any).trial_end) {
          const remaining = differenceInDays(new Date((data as any).trial_end), new Date());
          if (remaining >= 0) {
            setDaysLeft(remaining);
            setIsTrial(true);
          }
        }
      });
  }, [user, isSubscribed]);

  if (!isTrial || dismissed || isSubscribed || daysLeft === null) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 border border-primary/30 rounded-xl p-3 mb-4 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Crown className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Free Trial — {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
            </p>
            <p className="text-xs text-muted-foreground">Enjoy all premium features during your trial</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/profile")}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> View Plan
          </button>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
