import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface XPNotificationProps {
  amount: number;
  reason: string;
  onDone: () => void;
}

export default function XPNotification({ amount, reason, onDone }: XPNotificationProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (amount <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.8 }}
      className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl bg-primary text-primary-foreground shadow-lg"
    >
      <Zap className="w-5 h-5" />
      <div>
        <p className="text-sm font-bold">+{amount} XP</p>
        <p className="text-xs opacity-80">{reason}</p>
      </div>
    </motion.div>
  );
}

// Global XP notification system
type XPEvent = { amount: number; reason: string };
let listeners: ((e: XPEvent) => void)[] = [];

export function emitXP(amount: number, reason: string) {
  listeners.forEach((fn) => fn({ amount, reason }));
}

export function useXPListener() {
  const [events, setEvents] = useState<(XPEvent & { id: number })[]>([]);
  let counter = 0;

  useEffect(() => {
    const handler = (e: XPEvent) => {
      setEvents((prev) => [...prev, { ...e, id: Date.now() + Math.random() }]);
    };
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  const dismiss = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return { events, dismiss };
}

export function XPNotificationContainer() {
  const { events, dismiss } = useXPListener();

  return (
    <AnimatePresence>
      {events.map((e) => (
        <XPNotification key={e.id} amount={e.amount} reason={e.reason} onDone={() => dismiss(e.id)} />
      ))}
    </AnimatePresence>
  );
}
