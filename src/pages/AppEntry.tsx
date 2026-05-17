import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SplashScreen from "@/components/SplashScreen";

export default function AppEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise((r) => setTimeout(r, 800));

    (async () => {
      const [{ data: { session } }] = await Promise.all([
        supabase.auth.getSession(),
        minDelay,
      ]);
      if (cancelled) return;
      navigate(session ? "/dashboard" : "/auth", { replace: true });
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return <SplashScreen />;
}
