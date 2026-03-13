import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, ToggleLeft, ToggleRight, Shield, Zap, Crown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

type FeatureControl = {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string;
  required_plan: string;
  is_enabled: boolean;
  updated_at: string;
};

export default function AdminFeatureControl() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<FeatureControl>>>({});

  const loadFeatures = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feature_controls")
      .select("*")
      .order("required_plan", { ascending: true });
    if (data) setFeatures(data as unknown as FeatureControl[]);
    setLoading(false);
  };

  useEffect(() => { loadFeatures(); }, []);

  const toggleFeature = async (id: string, currentEnabled: boolean) => {
    await supabase.from("feature_controls").update({
      is_enabled: !currentEnabled,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    } as any).eq("id", id);
    toast.success(!currentEnabled ? "Feature enabled" : "Feature disabled");
    loadFeatures();
  };

  const changePlan = async (id: string, newPlan: string) => {
    await supabase.from("feature_controls").update({
      required_plan: newPlan,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    } as any).eq("id", id);
    toast.success(`Plan requirement updated to ${newPlan.toUpperCase()}`);
    loadFeatures();
  };

  const PLAN_COLORS: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/20 text-primary",
    elite: "bg-amber-500/20 text-amber-600",
  };

  const PLAN_ICONS: Record<string, typeof Shield> = {
    free: Shield,
    pro: Zap,
    elite: Crown,
  };

  // Group by plan
  const proFeatures = features.filter(f => f.required_plan === "pro");
  const eliteFeatures = features.filter(f => f.required_plan === "elite");
  const freeFeatures = features.filter(f => f.required_plan === "free");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground animate-pulse text-sm">Loading feature controls...</p>
      </div>
    );
  }

  const FeatureRow = ({ feature }: { feature: FeatureControl }) => {
    const PlanIcon = PLAN_ICONS[feature.required_plan] || Shield;
    return (
      <div className="flex items-center justify-between p-3 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => toggleFeature(feature.id, feature.is_enabled)}
            className="flex-shrink-0"
          >
            {feature.is_enabled ? (
              <ToggleRight className="w-6 h-6 text-primary" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-muted-foreground" />
            )}
          </button>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${feature.is_enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
              {feature.feature_name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{feature.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select
            value={feature.required_plan}
            onValueChange={(val) => changePlan(feature.id, val)}
          >
            <SelectTrigger className="w-[100px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="elite">Elite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const PlanSection = ({ title, featureList, plan }: { title: string; featureList: FeatureControl[]; plan: string }) => {
    if (featureList.length === 0) return null;
    const PlanIcon = PLAN_ICONS[plan] || Shield;
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <PlanIcon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PLAN_COLORS[plan]}`}>{plan}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {featureList.filter(f => f.is_enabled).length}/{featureList.length} enabled
          </span>
        </div>
        <div>
          {featureList.map(f => <FeatureRow key={f.id} feature={f} />)}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Info Banner */}
      <div className="glass-card p-4 border-l-4 border-primary">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Feature Control Panel</p>
            <p className="text-xs text-muted-foreground">
              Toggle features on/off for all users instantly. Change which plan a feature belongs to without code changes. All changes take effect immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{features.filter(f => f.is_enabled).length}</p>
          <p className="text-[10px] text-muted-foreground">Enabled</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-destructive">{features.filter(f => !f.is_enabled).length}</p>
          <p className="text-[10px] text-muted-foreground">Disabled</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-foreground">{features.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Features</p>
        </div>
      </div>

      {freeFeatures.length > 0 && <PlanSection title="Free Features" featureList={freeFeatures} plan="free" />}
      <PlanSection title="Pro Features" featureList={proFeatures} plan="pro" />
      <PlanSection title="Elite Features" featureList={eliteFeatures} plan="elite" />
    </motion.div>
  );
}
