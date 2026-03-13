import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
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
  const [loading, setLoading] = useState(true);

  const checkRole = async (userId: string, email?: string) => {
    console.log("Checking admin role for:", email, userId);
    
    // Hardcoded backup check
    if (email === "nagtilakprem99@gmail.com") {
      console.log("Admin email matched (hardcoded check)");
      setIsAdmin(true);
      return;
    }
    
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    console.log("has_role RPC result:", data, error);
    setIsAdmin(!!data);
  };

  const checkSubscription = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_subscribed, trial_end, is_trial_active")
      .eq("user_id", userId)
      .single();
    setIsSubscribed(!!data?.is_subscribed);
    const profile = data as any;
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("Auth state changed:", _event, "email:", session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            await Promise.all([
              checkRole(session.user.id, session.user.email ?? undefined),
              checkSubscription(session.user.id),
            ]);
            setLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSubscribed(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, isAdmin, isSubscribed, isTrialActive, trialDaysLeft, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
