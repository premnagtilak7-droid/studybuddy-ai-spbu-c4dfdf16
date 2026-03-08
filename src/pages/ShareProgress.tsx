import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getUserXP, getLevel } from "@/lib/xp-store";
import { getStudyStreak } from "@/lib/study-tracker";
import { Download, Share2, Flame, BookOpen, Trophy, Clock } from "lucide-react";

export default function ShareProgress() {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [xp, setXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [topicsCompleted, setTopicsCompleted] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [subjectCount, setSubjectCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const xpVal = await getUserXP();
    setXP(xpVal);
    setStreak(getStudyStreak());

    const { data: topics } = await supabase.from("topics").select("id").eq("is_completed", true);
    setTopicsCompleted(topics?.length || 0);

    const { data: subjects } = await supabase.from("subjects").select("id");
    setSubjectCount(subjects?.length || 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: logs } = await supabase.from("study_logs").select("duration_minutes").gte("logged_at", weekAgo.toISOString());
    const totalMinutes = logs?.reduce((acc, l) => acc + l.duration_minutes, 0) || 0;
    setWeeklyHours(Math.round(totalMinutes / 60 * 10) / 10);
  }

  const level = getLevel(xp);

  async function downloadCard() {
    if (!cardRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
      const link = document.createElement("a");
      link.download = "sppu-study-progress.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Fallback: copy text
      const text = `🎓 SPPU Study Progress\n🔥 ${streak} day streak\n📚 ${topicsCompleted} topics completed\n${level.emoji} ${level.name} (${xp} XP)\n⏱️ ${weeklyHours}h this week`;
      navigator.clipboard.writeText(text);
      alert("Card text copied to clipboard!");
    }
  }

  function shareWhatsApp() {
    const text = `🎓 *SPPU Study Progress*\n🔥 ${streak} day streak\n📚 ${topicsCompleted} topics completed\n${level.emoji} ${level.name} (${xp} XP)\n⏱️ ${weeklyHours}h this week\n\n_Studying with SPPU Study App!_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Share Progress</h1>
          <p className="text-muted-foreground text-sm">Generate your progress card and share it</p>
        </div>

        {/* Progress Card */}
        <div ref={cardRef} className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(217, 91%, 60%), hsl(280, 67%, 60%))" }}>
          <div className="p-8 text-white">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg">SPPU Study</p>
                <p className="text-[10px] opacity-80">2024 Pattern</p>
              </div>
            </div>

            <p className="text-sm opacity-80 mb-1">{user?.email}</p>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-3xl">{level.emoji}</span>
              <div>
                <p className="text-xl font-bold">{level.name}</p>
                <p className="text-sm opacity-80">{xp} XP</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <Flame className="w-6 h-6 mb-1" />
                <p className="text-2xl font-bold">{streak}</p>
                <p className="text-xs opacity-80">Day Streak</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <BookOpen className="w-6 h-6 mb-1" />
                <p className="text-2xl font-bold">{topicsCompleted}</p>
                <p className="text-xs opacity-80">Topics Done</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <Clock className="w-6 h-6 mb-1" />
                <p className="text-2xl font-bold">{weeklyHours}h</p>
                <p className="text-xs opacity-80">This Week</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <Trophy className="w-6 h-6 mb-1" />
                <p className="text-2xl font-bold">{subjectCount}</p>
                <p className="text-xs opacity-80">Subjects</p>
              </div>
            </div>

            <p className="text-center text-[10px] opacity-50 mt-6">sppu-study.lovable.app</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={downloadCard} className="flex-1"><Download className="w-4 h-4 mr-2" />Download Card</Button>
          <Button onClick={shareWhatsApp} variant="outline" className="flex-1"><Share2 className="w-4 h-4 mr-2" />Share on WhatsApp</Button>
        </div>
      </div>
    </AppLayout>
  );
}
