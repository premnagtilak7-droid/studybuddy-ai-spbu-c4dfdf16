import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playReminderSound } from "@/lib/sounds";

interface ReminderBannerData {
  id: string;
  subject: string;
  message: string;
}

let bannerListeners: ((data: ReminderBannerData) => void)[] = [];

export function showReminderBanner(subject: string, message: string) {
  const data = { id: `${Date.now()}`, subject, message };
  bannerListeners.forEach(fn => fn(data));
}

export default function ReminderBanner() {
  const [banner, setBanner] = useState<ReminderBannerData | null>(null);
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    const handler = (data: ReminderBannerData) => {
      setBanner(data);
      setSnoozed(false);
      playReminderSound();
    };
    bannerListeners.push(handler);
    return () => { bannerListeners = bannerListeners.filter(l => l !== handler); };
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 15000);
    return () => clearTimeout(t);
  }, [banner]);

  function handleSnooze() {
    if (!banner) return;
    setSnoozed(true);
    setBanner(null);
    // Re-show after 10 minutes
    const subj = banner.subject;
    const msg = banner.message;
    setTimeout(() => showReminderBanner(subj, msg), 10 * 60 * 1000);
  }

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] max-w-md w-[calc(100%-2rem)] bg-primary text-primary-foreground rounded-xl shadow-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 mt-0.5 shrink-0 animate-bounce" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">📚 Study Reminder: {banner.subject}</p>
              <p className="text-xs opacity-90 mt-0.5">{banner.message}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setBanner(null)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" variant="secondary" className="text-xs h-7 gap-1" onClick={handleSnooze}>
              <Clock className="w-3 h-3" />Snooze 10 min
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setBanner(null)}>
              Dismiss
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
