import { Trophy, Users, BookOpen } from "lucide-react";
import AppLayout from "../components/AppLayout";
import PomodoroTimer from "../components/PomodoroTimer";

export default function StudyRoom() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Room</h1>
          <p className="text-sm text-muted-foreground mt-1">Focus sessions & leaderboard</p>
        </div>

        <PomodoroTimer />

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

          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start studying by completing topics in your subjects. Your study activity will appear here once you log your first session.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
