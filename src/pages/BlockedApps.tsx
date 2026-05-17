import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Ban, Plus, Trash2, BarChart3, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DEFAULT_BLOCKED_APPS } from "@/lib/focus-block";

type Row = {
  id: string;
  label: string;
  package_name: string;
  enabled: boolean;
  is_custom: boolean;
};

const pkgSchema = z
  .string()
  .trim()
  .min(3, "Package name too short")
  .max(120, "Package name too long")
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i, "Use format: com.company.app");
const labelSchema = z.string().trim().min(1, "Name required").max(40, "Max 40 chars");

export default function BlockedApps() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newPkg, setNewPkg] = useState("");
  const [stats, setStats] = useState<{ label: string; count: number }[]>([]);

  useEffect(() => { if (user) { void load(); void loadStats(); } }, [user]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("user_blocked_apps")
      .select("*")
      .eq("user_id", user!.id)
      .order("is_custom", { ascending: true })
      .order("label", { ascending: true });
    let list = (data ?? []) as Row[];

    // First-time seed: insert curated catalog (all enabled by default)
    if (list.length === 0) {
      const seed = DEFAULT_BLOCKED_APPS.map(a => ({
        user_id: user!.id, label: a.label, package_name: a.pkg, enabled: true, is_custom: false,
      }));
      await supabase.from("user_blocked_apps").insert(seed);
      const { data: seeded } = await supabase
        .from("user_blocked_apps").select("*").eq("user_id", user!.id);
      list = (seeded ?? []) as Row[];
    }
    setRows(list);
    setLoading(false);
  }

  async function loadStats() {
    // Aggregate blocked_attempts from this user's focus sessions
    const { data } = await supabase
      .from("focus_sessions")
      .select("blocked_attempts")
      .eq("user_id", user!.id);
    const counts: Record<string, number> = {};
    (data ?? []).forEach((s: any) => {
      const arr: any[] = Array.isArray(s.blocked_attempts) ? s.blocked_attempts : [];
      arr.forEach(a => {
        const k = a?.app || a?.pkg || "Unknown";
        counts[k] = (counts[k] || 0) + 1;
      });
    });
    const ranked = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    setStats(ranked);
  }

  async function toggle(row: Row, enabled: boolean) {
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, enabled } : r));
    const { error } = await supabase
      .from("user_blocked_apps")
      .update({ enabled })
      .eq("id", row.id);
    if (error) {
      toast.error("Couldn't save toggle");
      setRows(rs => rs.map(r => r.id === row.id ? { ...r, enabled: !enabled } : r));
    }
  }

  async function addCustom() {
    const lParse = labelSchema.safeParse(newLabel);
    if (!lParse.success) { toast.error(lParse.error.issues[0].message); return; }
    const pParse = pkgSchema.safeParse(newPkg);
    if (!pParse.success) { toast.error(pParse.error.issues[0].message); return; }
    if (rows.some(r => r.package_name.toLowerCase() === pParse.data.toLowerCase())) {
      toast.error("That package is already in your list"); return;
    }
    const { data, error } = await supabase
      .from("user_blocked_apps")
      .insert({
        user_id: user!.id,
        label: lParse.data,
        package_name: pParse.data.toLowerCase(),
        enabled: true,
        is_custom: true,
      })
      .select()
      .single();
    if (error) { toast.error("Failed to add"); return; }
    setRows(rs => [...rs, data as Row]);
    setNewLabel(""); setNewPkg("");
    toast.success(`${lParse.data} added`);
  }

  async function remove(row: Row) {
    const { error } = await supabase.from("user_blocked_apps").delete().eq("id", row.id);
    if (error) { toast.error("Failed to remove"); return; }
    setRows(rs => rs.filter(r => r.id !== row.id));
  }

  const enabledCount = useMemo(() => rows.filter(r => r.enabled).length, [rows]);
  const top = stats[0];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ban className="w-6 h-6 text-destructive" /> Blocked Apps
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose which apps to block during Focus Mode sessions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Apps blocked</p>
              <p className="text-2xl font-bold text-foreground">{enabledCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Total attempts</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.reduce((a, s) => a + s.count, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className={top ? "border-destructive/40" : ""}>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Most attempted</p>
              <p className="text-base font-bold text-foreground truncate">
                {top ? `${top.label}` : "—"}
              </p>
              {top && <p className="text-xs text-destructive">{top.count} time{top.count === 1 ? "" : "s"}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Add custom */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add a custom app
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              On Android, find the package name in Play Store URL
              (<code>play.google.com/store/apps/details?id=<b>com.example.app</b></code>).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2">
              <Input
                placeholder="App name (e.g. Discord)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                maxLength={40}
              />
              <Input
                placeholder="com.discord"
                value={newPkg}
                onChange={e => setNewPkg(e.target.value)}
                maxLength={120}
              />
              <Button onClick={addCustom} disabled={!newLabel.trim() || !newPkg.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4" /> Your block list
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No apps yet.</p>
            ) : rows.map(row => {
              const attempts = stats.find(s => s.label === row.label)?.count ?? 0;
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{row.label}</p>
                      {row.is_custom && (
                        <Badge variant="outline" className="text-[10px] py-0">Custom</Badge>
                      )}
                      {attempts > 0 && (
                        <Badge variant="destructive" className="text-[10px] py-0 gap-1">
                          <BarChart3 className="w-2.5 h-2.5" /> {attempts}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{row.package_name}</p>
                  </div>
                  <Switch checked={row.enabled} onCheckedChange={(v) => toggle(row, v)} />
                  {row.is_custom && (
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(row)}
                      aria-label={`Remove ${row.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Native blocking is only active in the Android build with Usage Access granted.
          On web and iOS, toggles still control what would be blocked, but actual blocking
          requires the mobile app.
        </p>
      </div>
    </AppLayout>
  );
}
