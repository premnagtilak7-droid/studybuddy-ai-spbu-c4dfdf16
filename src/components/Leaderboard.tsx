import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  value: number;
};

type Tab = "xp" | "topics" | "streak";

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>("xp");
  const [period, setPeriod] = useState<"weekly" | "alltime">("alltime");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadLeaderboard();
  }, [tab, period]);

  async function loadLeaderboard() {
    setLoading(true);
    if (tab === "xp") {
      const { data } = await supabase
        .from("user_xp")
        .select("user_id, total_xp")
        .order("total_xp", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const userIds = data.map((d) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds);

        setEntries(
          data.map((d) => {
            const p = profiles?.find((pr) => pr.user_id === d.user_id);
            return {
              user_id: d.user_id,
              display_name: p?.display_name || p?.email?.split("@")[0] || "Anonymous",
              value: d.total_xp,
            };
          })
        );
      } else {
        setEntries([]);
      }
    } else {
      setEntries([]);
    }
    setLoading(false);
  }

  const rankIcons = [
    <Crown className="w-4 h-4 text-accent" />,
    <Medal className="w-4 h-4 text-muted-foreground" />,
    <Medal className="w-4 h-4 text-primary" />,
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "xp", label: "XP Points" },
    { key: "topics", label: "Topics" },
    { key: "streak", label: "Streak" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-primary" />
        Leaderboard
      </h3>

      <div className="flex gap-1 mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-4">
        {(["alltime", "weekly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
              period === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "alltime" ? "All Time" : "Weekly"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No data yet. Start studying to appear here!</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isCurrentUser = entry.user_id === user?.id;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-2.5 rounded-lg ${
                  isCurrentUser ? "bg-primary/10 ring-1 ring-primary/30" : "bg-secondary/50"
                }`}
              >
                <div className="w-6 flex items-center justify-center">
                  {i < 3 ? rankIcons[i] : <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {entry.display_name} {isCurrentUser && <span className="text-[10px] text-primary">(You)</span>}
                  </p>
                </div>
                <span className="text-sm font-bold font-mono text-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />
                  {entry.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
