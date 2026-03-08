import { useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Plus, Trash2, ToggleLeft, ToggleRight, Copy, Dice5, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

type Coupon = {
  id: string; code: string; discount_percent: number; is_active: boolean;
  max_uses: number | null; used_count: number; created_at: string;
  expiry_date: string | null; discount_type: string; flat_amount: number;
  plan_type: string;
};

type Redemption = { id: string; coupon_id: string; user_id: string; redeemed_at: string };

type Props = {
  coupons: Coupon[];
  redemptions: Redemption[];
  profiles: { user_id: string; email: string }[];
  onRefresh: () => void;
};

export default function AdminCouponManager({ coupons, redemptions, profiles, onRefresh }: Props) {
  const { user } = useAuth();
  const [newCode, setNewCode] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountPercent, setDiscountPercent] = useState(100);
  const [flatAmount, setFlatAmount] = useState(0);
  const [maxUses, setMaxUses] = useState<number | "">("");
  const [expiryDate, setExpiryDate] = useState("");
  const [planType, setPlanType] = useState("all");
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = "SPPU_" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setNewCode(code);
  };

  const createCoupon = async () => {
    if (!newCode.trim()) return toast.error("Enter a coupon code");
    const { error } = await supabase.from("coupons").insert({
      code: newCode.toUpperCase().trim(),
      discount_percent: discountType === "percent" ? discountPercent : 0,
      discount_type: discountType,
      flat_amount: discountType === "flat" ? flatAmount : 0,
      max_uses: maxUses || null,
      expiry_date: expiryDate || null,
      plan_type: planType,
      created_by: user?.id,
    } as any);
    if (error) return toast.error(error.message);
    toast.success(`Coupon ${newCode.toUpperCase()} created!`);
    setNewCode(""); setMaxUses(""); setExpiryDate("");
    onRefresh();
  };

  const toggleCoupon = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    onRefresh();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Coupon deleted");
    onRefresh();
  };

  const isExpired = (date: string | null) => date ? new Date(date) < new Date() : false;

  const getUserEmail = (userId: string) => profiles.find(p => p.user_id === userId)?.email || userId;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Create Coupon */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Ticket className="w-4 h-4" /> Create New Coupon
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Code</Label>
            <div className="flex gap-1">
              <Input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="SPPU_PRO" className="font-mono uppercase" />
              <Button variant="outline" size="icon" onClick={generateCode} title="Generate random"><Dice5 className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Discount Type</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage (%)</SelectItem>
                <SelectItem value="flat">Flat Amount (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {discountType === "percent" ? (
            <div>
              <Label className="text-xs">Discount %</Label>
              <Input type="number" value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))} min={1} max={100} />
            </div>
          ) : (
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" value={flatAmount} onChange={e => setFlatAmount(Number(e.target.value))} min={1} />
            </div>
          )}
          <div>
            <Label className="text-xs">Expiry Date</Label>
            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Max Uses</Label>
            <Input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : "")} min={1} placeholder="∞" />
          </div>
          <div>
            <Label className="text-xs">Plan Type</Label>
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free Users Only</SelectItem>
                <SelectItem value="premium">Premium Users Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={createCoupon}><Plus className="w-4 h-4 mr-1" /> Create Coupon</Button>
      </div>

      {/* Coupons Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Code</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Discount</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Expiry</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Uses</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const expired = isExpired(c.expiry_date);
                const couponRedemptions = redemptions.filter(r => r.coupon_id === c.id);
                return (
                  <>
                    <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                      onClick={() => setExpandedCoupon(expandedCoupon === c.id ? null : c.id)}>
                      <td className="p-3 font-mono font-bold text-xs text-foreground flex items-center gap-1">
                        {c.code}
                        <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}>
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {c.discount_type === "flat" ? `₹${c.flat_amount}` : `${c.discount_percent}%`}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : "Never"}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{c.used_count}/{c.max_uses ?? "∞"}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          expired ? "bg-destructive/20 text-destructive" :
                          c.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {expired ? "EXPIRED" : c.is_active ? "ACTIVE" : "OFF"}
                        </span>
                      </td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toggleCoupon(c.id, c.is_active)}>
                            {c.is_active ? <ToggleRight className="w-3.5 h-3.5 text-primary" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteCoupon(c.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedCoupon === c.id && couponRedemptions.length > 0 && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={6} className="p-3 bg-secondary/30">
                          <p className="text-xs font-semibold text-foreground mb-2">Redemptions ({couponRedemptions.length})</p>
                          <div className="space-y-1">
                            {couponRedemptions.map(r => (
                              <div key={r.id} className="flex justify-between text-xs text-muted-foreground">
                                <span className="font-mono">{getUserEmail(r.user_id)}</span>
                                <span>{new Date(r.redeemed_at).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {coupons.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No coupons yet</p>}
      </div>
    </motion.div>
  );
}
