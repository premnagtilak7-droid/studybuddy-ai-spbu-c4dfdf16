import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, type PlanType } from "@/lib/plans";
import AppLayout from "@/components/AppLayout";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const planIcons: Record<PlanType, React.ReactNode> = {
  free: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  elite: <Sparkles className="w-6 h-6" />,
};

const planGradients: Record<PlanType, string> = {
  free: "from-muted/50 to-muted/30",
  pro: "from-primary/20 to-primary/5",
  elite: "from-accent/20 to-accent/5",
};

export default function Pricing() {
  const { userPlan, isTrialActive } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (plan: PlanType) => {
    if (plan === "free") {
      toast.info("You're already on the Free plan");
      return;
    }
    if (plan === userPlan) {
      toast.info(`You're already on the ${PLANS[plan].name} plan`);
      return;
    }
    // Razorpay not yet integrated
    toast.info("Payment integration coming soon! Your Razorpay keys are being set up.", { duration: 4000 });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold text-foreground mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Unlock powerful study tools designed for every student. Start free, upgrade anytime.
          </p>
          {isTrialActive && (
            <Badge variant="outline" className="mt-3 text-primary border-primary/40">
              🎉 Free trial active — all features unlocked!
            </Badge>
          )}
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {(Object.entries(PLANS) as [PlanType, typeof PLANS[PlanType]][]).map(
            ([key, plan], i) => {
              const isCurrent = key === userPlan;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative glass-card p-6 flex flex-col rounded-2xl border-2 transition-all ${
                    plan.popular
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-transparent hover:border-muted-foreground/20"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3">Most Popular</Badge>
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${planGradients[key]} flex items-center justify-center mb-4`}>
                    {planIcons[key]}
                  </div>

                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>

                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-bold text-foreground">
                      {plan.price === 0 ? "Free" : `₹${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-muted-foreground">/month</span>
                    )}
                  </div>

                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelect(key)}
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full gap-2"
                    disabled={isCurrent}
                  >
                    {isCurrent ? (
                      "Current Plan"
                    ) : key === "free" ? (
                      "Get Started"
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              );
            }
          )}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            All plans support UPI, Debit/Credit Cards & Net Banking via Razorpay.
            <br />
            Cancel anytime from your profile. No hidden charges.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
