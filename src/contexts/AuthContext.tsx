import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { type PlanType } from "@/lib/plans";
import { updateLastActivity, shouldAutoLogout } from "@/lib/auth-security";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  userPlan: PlanType;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isSubscribed: false,
  isTrialActive: false,
  trialDaysLeft: 0,
  userPlan: "free",
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [userPlan, setUserPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);

  const checkRole = async (userId: string, email?: string) => {
    if (email === "nagtilakprem99@gmail.com") {
      setIsAdmin(true);
      return;
    }
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    setIsAdmin(!!data);
  };

  const checkSubscription = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_subscribed, trial_end, is_trial_active, current_plan")
      .eq("user_id", userId)
      .single();
    const profile = data as any;
    setIsSubscribed(!!profile?.is_subscribed);
    
    const plan = (profile?.current_plan || "free") as PlanType;
    setUserPlan(plan);

    if (profile?.is_trial_active && profile?.trial_end) {
      const daysLeft = Math.max(0, Math.ceil((new Date(profile.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      setIsTrialActive(daysLeft > 0);
      setTrialDaysLeft(daysLeft);
    } else {
      setIsTrialActive(false);
      setTrialDaysLeft(0);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([checkRole(user.id, user.email ?? undefined), checkSubscription(user.id)]);
    }
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Auto-logout after 30 days of inactivity
  useEffect(() => {
    if (user && shouldAutoLogout()) {
      signOut();
      return;
    }

    // Track activity
    updateLastActivity();
    const events = ["click", "keydown", "scroll", "touchstart"];
    let debounceTimer: ReturnType<typeof setTimeout>;
    const handleActivity = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => updateLastActivity(), 60000); // Update at most once per minute
    };
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearTimeout(debounceTimer);
    };
  }, [user, signOut]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Check email verification - if user signed up with email and hasn't confirmed
          const emailConfirmed = session.user.email_confirmed_at || session.user.confirmed_at;
          if (!emailConfirmed && session.user.app_metadata?.provider === "email") {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          setTimeout(async () => {
            await Promise.all([
              checkRole(session.user.id, session.user.email ?? undefined),
              checkSubscription(session.user.id),
            ]);
            updateLastActivity();
            setLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSubscribed(false);
          setUserPlan("free");
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const emailConfirmed = session.user.email_confirmed_at || session.user.confirmed_at;
        if (!emailConfirmed && session.user.app_metadata?.provider === "email") {
          supabase.auth.signOut();
          setLoading(false);
          return;
        }
        Promise.all([
          checkRole(session.user.id, session.user.email ?? undefined),
          checkSubscription(session.user.id),
        ]).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isSubscribed, isTrialActive, trialDaysLeft, userPlan, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
