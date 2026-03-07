import { Trophy, Users, Crown } from "lucide-react";
import AppLayout from "../components/AppLayout";

const leaderboard = [
  { name: "You", hours: 42, rank: 1, avatar: "🎯" },
  { name: "Rohan K.", hours: 38, rank: 2, avatar: "📚" },
  { name: "Priya M.", hours: 35, rank: 3, avatar: "⚡" },
  { name: "Aman S.", hours: 30, rank: 4, avatar: "🔥" },
  { name: "Sneha D.", hours: 28, rank: 5, avatar: "💡" },
];

export default function StudyRoom() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Room</h1>
          <p className="text-sm text-muted-foreground mt-1">Compete with friends — This Week's Leaderboard</p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-foreground">Weekly Leaderboard</h3>
            </div>
            <button className="text-xs font-medium gradient-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Users className="w-3 h-3" /> Invite Friends
            </button>
          </div>

          <div className="divide-y divide-border">
            {leaderboard.map((user) => (
              <div
                key={user.rank}
                className={`flex items-center justify-between px-5 py-4 ${
                  user.rank === 1 ? "bg-accent/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center font-bold font-mono text-muted-foreground">
                    {user.rank === 1 ? <Crown className="w-5 h-5 text-accent mx-auto" /> : `#${user.rank}`}
                  </span>
                  <span className="text-2xl">{user.avatar}</span>
                  <div>
                    <p className={`text-sm font-semibold ${user.name === "You" ? "text-primary" : "text-foreground"}`}>
                      {user.name}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-mono font-bold text-foreground">{user.hours}h</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
