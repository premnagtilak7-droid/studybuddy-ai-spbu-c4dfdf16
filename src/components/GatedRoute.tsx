import { type FeatureKey } from "@/lib/plans";
import { FeatureGate } from "@/components/FeatureGate";

interface GatedRouteProps {
  feature: FeatureKey;
  featureName: string;
  children: React.ReactNode;
}

export function GatedRoute({ feature, featureName, children }: GatedRouteProps) {
  return (
    <FeatureGate feature={feature} featureName={featureName}>
      {children}
    </FeatureGate>
  );
}
