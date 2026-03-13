import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Crown, Sparkles, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { type PlanType, type FeatureKey, FEATURE_PLAN_MAP, PLANS, canAccessFeature } from "@/lib/plans";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  featureName?: string;
}

export function FeatureGate({ feature, children, featureName }: FeatureGateProps) {
  const { userPlan, isTrialActive } = useAuth();

  // Allow access during trial
  if (isTrialActive) return <>{children}</>;

  if (canAccessFeature(userPlan, feature)) return <>{children}</>;

  const requiredPlan = FEATURE_PLAN_MAP[feature];
  const planInfo = PLANS[requiredPlan];

  return (
    <UpgradeOverlay
      featureName={featureName || feature.replace(/_/g, " ")}
      requiredPlan={requiredPlan}
      planName={planInfo.name}
      planPrice={planInfo.priceLabel}
    />
  );
}

function UpgradeOverlay({
  featureName,
  requiredPlan,
  planName,
  planPrice,
}: {
  featureName: string;
  requiredPlan: PlanType;
  planName: string;
  planPrice: string;
}) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 max-w-md w-full relative"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-10 h-10 text-primary" />
        </div>

        <h3 className="text-xl font-bold text-foreground mb-2 capitalize">
          {featureName} is Locked
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Upgrade to <span className="font-semibold text-primary">{planName}</span> ({planPrice}) to unlock this feature and supercharge your studies.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/pricing")}
            className="w-full gap-2"
            size="lg"
          >
            <Crown className="w-4 h-4" />
            View Plans & Upgrade
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default FeatureGate;
