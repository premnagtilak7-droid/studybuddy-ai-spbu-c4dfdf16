import { useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Lock, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Success sound
const playSuccess = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
};

export default function CouponRedeemModal({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return toast.error("Enter a coupon code");
    if (!user) return toast.error("Please log in first");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("redeem-coupon", {
        body: { code },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
      } else {
        playSuccess();
        setRedeemed(true);
        toast.success("🎉 Coupon redeemed! Premium features unlocked!");
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to redeem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 max-w-md w-full"
      >
        {redeemed ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Premium Unlocked! 🎉</h3>
            <p className="text-sm text-muted-foreground mt-2">All features are now available</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-xl gradient-accent flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Redeem Coupon</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your coupon code to unlock premium features
              </p>
            </div>

            <div className="space-y-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="font-mono text-center text-lg tracking-wider"
              />
              <Button onClick={handleRedeem} className="w-full" disabled={loading}>
                {loading ? "Redeeming..." : "Redeem Code"}
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full">
                Cancel
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export function PaywallGate({
  children,
  featureName,
}: {
  children: React.ReactNode;
  featureName: string;
}) {
  const { isSubscribed, isTrialActive, user, refreshProfile } = useAuth();
  const [showRedeem, setShowRedeem] = useState(false);

  // Allow access if subscribed OR on active trial
  if (isSubscribed || isTrialActive) return <>{children}</>;

  return (
    <>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{featureName} is Premium</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          This feature requires a premium subscription. Use a coupon code to unlock it instantly.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setShowRedeem(true)}>
            <Ticket className="w-4 h-4 mr-1" /> Redeem Coupon
          </Button>
          <Button variant="outline" disabled>
            <Sparkles className="w-4 h-4 mr-1" /> Buy Premium ₹199
          </Button>
        </div>
      </div>

      {showRedeem && (
        <CouponRedeemModal
          onSuccess={() => {
            setShowRedeem(false);
            refreshProfile();
          }}
          onClose={() => setShowRedeem(false)}
        />
      )}
    </>
  );
}
