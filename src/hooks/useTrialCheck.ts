import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays } from "date-fns";
import { sendLocalNotification } from "@/lib/notifications";

export function useTrialCheck() {
  const { user, isSubscribed } = useAuth();

  useEffect(() => {
    if (!user || isSubscribed) return;

    const checkTrial = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("trial_end, is_trial_active")
        .eq("user_id", user.id)
        .single();

      if (!data) return;
      const profile = data as any;
      if (!profile.is_trial_active || !profile.trial_end) return;

      const daysLeft = differenceInDays(new Date(profile.trial_end), new Date());

      // Trial expired — deactivate
      if (daysLeft < 0) {
        await supabase
          .from("profiles")
          .update({ is_trial_active: false } as any)
          .eq("user_id", user.id);
        return;
      }

      // Day 5 or Day 7 (2 days left or 0 days left) — send reminder
      const notifKey = `trial_notif_day_${7 - daysLeft}`;
      const alreadySent = localStorage.getItem(notifKey);
      if (!alreadySent && (daysLeft === 2 || daysLeft === 0)) {
        localStorage.setItem(notifKey, "true");
        sendLocalNotification(
          "⏰ Trial Ending Soon!",
          daysLeft === 0
            ? "Your free trial ends today! Subscribe now to keep premium features."
            : "Your free trial ends in 2 days. Don't miss out on premium features!",
          "trial"
        );
      }

      // Update last_active_at
      await supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    };

    checkTrial();
  }, [user, isSubscribed]);
}
