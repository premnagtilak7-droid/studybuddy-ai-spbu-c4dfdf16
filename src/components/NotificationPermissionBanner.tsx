import { useState, useEffect, forwardRef } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission, getPermissionStatus } from "@/lib/notifications";
import { toast } from "sonner";

const NotificationPermissionBanner = forwardRef<HTMLDivElement>(function NotificationPermissionBanner(_props, ref) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const perm = getPermissionStatus();
    const dismissed = localStorage.getItem("notif_perm_dismissed");
    if (perm === "default" && !dismissed) {
      // Delay showing to not overwhelm on first load
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const handleAllow = async () => {
    const result = await requestNotificationPermission();
    if (result === "granted") {
      toast.success("Notifications enabled! You'll get study reminders.");
    } else {
      toast.info("You can enable notifications later in settings.");
    }
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("notif_perm_dismissed", "1");
  };

  return (
    <div ref={ref} className="fixed top-4 right-4 z-[100] w-80 bg-card border border-border rounded-xl shadow-lg p-4">
      <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <BellRing className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Enable Notifications</p>
          <p className="text-xs text-muted-foreground mt-1">Get exam reminders, streak alerts, and study session notifications</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleAllow}>Allow</Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>Later</Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NotificationPermissionBanner;
