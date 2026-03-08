import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, Pencil, Check, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDailyGoal, setDailyGoal, getTodayStudyMinutes, logStudyMinutes } from "@/lib/daily-goal-store";
import { useToast } from "@/hooks/use-toast";

export default function DailyStudyGoal() {
  const [targetHours, setTargetHours] = useState(4);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("4");
  const [logging, setLogging] = useState(false);
  const [logValue, setLogValue] = useState("30");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([getDailyGoal(), getTodayStudyMinutes()]).then(([goal, mins]) => {
      setTargetHours(goal);
      setEditValue(String(goal));
      setTodayMinutes(mins);
    });
  }, []);

  const todayHours = todayMinutes / 60;
  const percent = targetHours > 0 ? Math.min(100, Math.round((todayHours / targetHours) * 100)) : 0;
  const remaining = Math.max(0, targetHours - todayHours);

  const handleSaveGoal = async () => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0 || val > 24) {
      toast({ title: "Enter a value between 0.5 and 24", variant: "destructive" });
      return;
    }
    await setDailyGoal(val);
    setTargetHours(val);
    setEditing(false);
    toast({ title: `Daily goal set to ${val}h` });
  };

  const handleLogTime = async () => {
    const mins = parseInt(logValue);
    if (isNaN(mins) || mins <= 0) {
      toast({ title: "Enter valid minutes", variant: "destructive" });
      return;
    }
    await logStudyMinutes(mins);
    setTodayMinutes((prev) => prev + mins);
    setLogging(false);
    setLogValue("30");
    toast({ title: `Logged ${mins} minutes!` });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Daily Study Goal
        </h3>
        <div className="flex items-center gap-1">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Pencil className="w-3 h-3" /> {targetHours}h target
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-16 h-7 text-xs"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
              />
              <span className="text-xs text-muted-foreground">hrs</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveGoal}>
                <Check className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={percent} className="h-3" />
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-muted-foreground">
            {todayHours.toFixed(1)}h / {targetHours}h studied
          </p>
          <p className={`text-xs font-bold font-mono ${percent >= 100 ? "text-primary" : "text-muted-foreground"}`}>
            {percent >= 100 ? "🎉 Goal reached!" : `${remaining.toFixed(1)}h left`}
          </p>
        </div>
      </div>

      {/* Quick log */}
      <div className="mt-3 pt-3 border-t border-border">
        {!logging ? (
          <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => setLogging(true)}>
            <Plus className="w-3.5 h-3.5" /> Log Study Time
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={logValue}
              onChange={(e) => setLogValue(e.target.value)}
              className="h-8 text-xs flex-1"
              type="number"
              min="1"
              placeholder="Minutes"
            />
            <span className="text-xs text-muted-foreground">min</span>
            <Button size="sm" className="h-8 text-xs" onClick={handleLogTime}>Log</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setLogging(false)}>✕</Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
