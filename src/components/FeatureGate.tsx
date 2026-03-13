import { useState, useEffect, createContext, useContext } from "react";
import { motion } from "framer-motion";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { type PlanType, type FeatureKey, FEATURE_PLAN_MAP, PLANS, canAccessFeature } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";

// Cache feature controls from DB
type FeatureControlEntry = { feature_key: string; required_plan: string; is_enabled: boolean };

let featureControlsCache: FeatureControlEntry[] | null = null;
let cacheLoadedAt = 0;

async function getFeatureControls(): Promise<FeatureControlEntry[]> {
  // Cache for 60 seconds
  if (featureControlsCache && Date.now() - cacheLoadedAt < 60000) {
    return featureControlsCache;
  }
  const { data } = await supabase.from("feature_controls").select("feature_key, required_plan, is_enabled");
  if (data) {
    featureControlsCache = data as unknown as FeatureControlEntry[];
    cacheLoadedAt = Date.now();
  }
  return featureControlsCache || [];
}

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  featureName?: string;
}

export function FeatureGate({ feature, children, featureName }: FeatureGateProps) {
  const { userPlan, isTrialActive } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [requiredPlan, setRequiredPlan] = useState<PlanType>("pro");

  useEffect(() => {
    let cancelled = false;
    getFeatureControls().then(controls => {
      if (cancelled) return;
      const control = controls.find(c => c.feature_key === feature);
      
      if (control && !control.is_enabled) {
        setIsDisabled(true);
        setHasAccess(false);
        setChecking(false);
        return;
      }

      const effectivePlan = (control?.required_plan as PlanType) || FEATURE_PLAN_MAP[feature] || "free";
      setRequiredPlan(effectivePlan);

      if (isTrialActive) {
        setHasAccess(true);
      } else {
        const PLAN_HIERARCHY: Record<string, number> = { free: 0, pro: 1, elite: 2 };
        setHasAccess((PLAN_HIERARCHY[userPlan] || 0) >= (PLAN_HIERARCHY[effectivePlan] || 0));
      }
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [feature, userPlan, isTrialActive]);

  if (checking) return <>{children}</>; // Show content while checking to avoid flash

  if (isDisabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 max-w-md w-full">
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-5">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Feature Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-6">
            This feature is currently disabled by the administrator. Please check back later.
          </p>
          <Button variant="ghost" onClick={() => window.history.back()} className="w-full">Go Back</Button>
        </motion.div>
      </div>
    );
  }

  if (hasAccess) return <>{children}</>;

  const planInfo = PLANS[requiredPlan] || PLANS.pro;

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
  featureName, requiredPlan, planName, planPrice,
}: {
  featureName: string; requiredPlan: PlanType; planName: string; planPrice: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 max-w-md w-full relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2 capitalize">{featureName} is Locked</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Upgrade to <span className="font-semibold text-primary">{planName}</span> ({planPrice}) to unlock this feature and supercharge your studies.
        </p>
        <div className="space-y-3">
          <Button onClick={() => navigate("/pricing")} className="w-full gap-2" size="lg">
            <Crown className="w-4 h-4" /> View Plans & Upgrade <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="w-full">Back to Dashboard</Button>
        </div>
      </motion.div>
    </div>
  );
}

// Export a function to invalidate cache when admin makes changes
export function invalidateFeatureCache() {
  featureControlsCache = null;
  cacheLoadedAt = 0;
}

export default FeatureGate;
