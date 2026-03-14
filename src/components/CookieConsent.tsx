import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4"
        >
          <div className="max-w-lg mx-auto bg-card border border-border rounded-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <Cookie className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-foreground font-medium">We use cookies</p>
                <p className="text-xs text-muted-foreground">
                  We use essential cookies for authentication and preferences. No tracking cookies.{" "}
                  <Link to="/privacy" className="underline text-primary">Privacy Policy</Link>
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={accept}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={decline}>Decline</Button>
                </div>
              </div>
              <button onClick={decline} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
