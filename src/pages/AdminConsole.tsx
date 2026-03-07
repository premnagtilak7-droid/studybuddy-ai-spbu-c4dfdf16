import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Ticket, Plus, Trash2, ToggleLeft, ToggleRight, Shield, Copy } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Profile = {
  user_id: string;
  email: string;
  display_name: string | null;
  is_subscribed: boolean;
  created_at: string;
};

type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  max_uses: number | null;
  used_count: number;
  created_at: string;
};

export default function AdminConsole() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tab, setTab] = useState<"users" | "coupons">("users");
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState(100);
  const [newMaxUses, setNewMaxUses] = useState<number | "">("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [{ data: profiles }, { data: couponData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    ]);
    if (profiles) setUsers(profiles);
    if (couponData) setCoupons(couponData);
  };

  const createCoupon = async () => {
    if (!newCode.trim()) return toast.error("Enter a coupon code");
    const { error } = await supabase.from("coupons").insert({
      code: newCode.toUpperCase().trim(),
      discount_percent: newDiscount,
      max_uses: newMaxUses || null,
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Coupon ${newCode.toUpperCase()} created!`);
      setNewCode("");
      setNewMaxUses("");
      loadData();
    }
  };

  const toggleCoupon = async (id: string, currentState: boolean) => {
    await supabase.from("coupons").update({ is_active: !currentState }).eq("id", id);
    loadData();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Coupon deleted");
    loadData();
  };

  const toggleSubscription = async (userId: string, current: boolean) => {
    await supabase.from("profiles").update({ is_subscribed: !current }).eq("user_id", userId);
    toast.success(`Subscription ${!current ? "activated" : "deactivated"}`);
    loadData();
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
            <p className="text-sm text-muted-foreground">Manage users, coupons, and access</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "users" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Users className="w-4 h-4 inline mr-1" /> User Registry ({users.length})
          </button>
          <button
            onClick={() => setTab("coupons")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "coupons" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Ticket className="w-4 h-4 inline mr-1" /> Coupon Engine ({coupons.length})
          </button>
        </div>

        {tab === "users" && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Subscribed</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-medium text-foreground">{u.display_name || "—"}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          u.is_subscribed ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                        }`}>
                          {u.is_subscribed ? "PRO" : "FREE"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSubscription(u.user_id, u.is_subscribed)}
                        >
                          {u.is_subscribed ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No users yet</p>
            )}
          </div>
        )}

        {tab === "coupons" && (
          <div className="space-y-4">
            {/* Create coupon */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Coupon
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <Label>Code</Label>
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="SPPU_PRO"
                    className="font-mono uppercase"
                  />
                </div>
                <div>
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(Number(e.target.value))}
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <Label>Max Uses (empty = ∞)</Label>
                  <Input
                    type="number"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value ? Number(e.target.value) : "")}
                    min={1}
                    placeholder="Unlimited"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={createCoupon} className="w-full">
                    <Ticket className="w-4 h-4 mr-1" /> Create
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Coupon list */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Discount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Uses</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="p-3 font-mono font-bold text-foreground flex items-center gap-2">
                          {c.code}
                          <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}>
                            <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </td>
                        <td className="p-3 font-mono">{c.discount_percent}% off</td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {c.used_count}/{c.max_uses ?? "∞"}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            c.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                          }`}>
                            {c.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="p-3 flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toggleCoupon(c.id, c.is_active)}>
                            {c.is_active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteCoupon(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {coupons.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No coupons yet. Create your first one above!</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
