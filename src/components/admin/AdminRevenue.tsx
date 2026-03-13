import { motion } from "framer-motion";
import { CreditCard, TrendingUp, Calendar, Download, IndianRupee, Users, TrendingDown, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

type Profile = {
  user_id: string; email: string; display_name: string | null;
  is_subscribed: boolean; created_at: string;
  current_plan?: string; plan_expires_at?: string | null;
  is_trial_active?: boolean; trial_end?: string | null;
};

type Payment = {
  id: string; user_id: string; amount: number; plan: string;
  status: string; created_at: string; currency: string;
};

type Props = { profiles: Profile[]; payments?: Payment[] };

const PLAN_PRICES: Record<string, number> = { pro: 149, elite: 299 };

export default function AdminRevenue({ profiles, payments = [] }: Props) {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Plan counts
  const freeUsers = profiles.filter(p => !p.current_plan || p.current_plan === "free").length;
  const proUsers = profiles.filter(p => p.current_plan === "pro").length;
  const eliteUsers = profiles.filter(p => p.current_plan === "elite").length;
  const trialUsers = profiles.filter(p => p.is_trial_active).length;

  // Revenue from payments table
  const successPayments = payments.filter(p => p.status === "success" || p.status === "captured");
  const allTimeRevenue = successPayments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonthPayments = successPayments.filter(p => new Date(p.created_at) >= thisMonthStart);
  const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // Estimated recurring revenue (from active subs)
  const estimatedMRR = proUsers * 149 + eliteUsers * 299;

  // Churn: users whose plan expired in last 30 days and didn't renew
  const expiredUsers = profiles.filter(p => {
    if (!p.plan_expires_at) return false;
    const exp = new Date(p.plan_expires_at);
    return exp < now && exp >= daysAgo(30) && (!p.current_plan || p.current_plan === "free");
  });
  const totalPaidEver = profiles.filter(p => p.current_plan === "pro" || p.current_plan === "elite").length + expiredUsers.length;
  const churnRate = totalPaidEver > 0 ? ((expiredUsers.length / totalPaidEver) * 100).toFixed(1) : "0";

  // Most popular plan
  const popularPlan = proUsers >= eliteUsers ? (proUsers > 0 ? "Pro" : "Free") : "Elite";

  // Monthly revenue graph (6 months)
  const monthlyRevenueData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
    const monthPayments = successPayments.filter(p => {
      const d = new Date(p.created_at);
      return d >= month && d < monthEnd;
    });
    return {
      month: month.toLocaleDateString("en", { month: "short" }),
      revenue: monthPayments.reduce((s, p) => s + p.amount, 0),
    };
  });

  // Daily signups (30 days)
  const dailySignups = Array.from({ length: 30 }, (_, i) => {
    const date = daysAgo(29 - i);
    const dateStr = date.toISOString().slice(0, 10);
    const count = profiles.filter(p => p.created_at.slice(0, 10) === dateStr).length;
    return {
      date: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      signups: count,
    };
  });

  // Plan distribution
  const pieData = [
    { name: "Free", value: freeUsers },
    { name: "Pro", value: proUsers },
    { name: "Elite", value: eliteUsers },
    { name: "Trial", value: trialUsers },
  ].filter(d => d.value > 0);
  const COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(38 92% 50%)", "hsl(210 100% 50%)"];

  const chartConfig = {
    revenue: { label: "Revenue ₹", color: "hsl(var(--primary))" },
    signups: { label: "Signups", color: "hsl(var(--primary))" },
  };

  const exportCSV = () => {
    const headers = ["Email", "Plan", "Amount", "Status", "Date"];
    const rows = successPayments.map(p => {
      const profile = profiles.find(pr => pr.user_id === p.user_id);
      return [profile?.email || p.user_id, p.plan, `₹${p.amount}`, p.status, new Date(p.created_at).toLocaleDateString()];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "revenue.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const StatCard = ({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.ElementType; sub?: string }) => (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="All-Time Revenue" value={`₹${allTimeRevenue.toLocaleString()}`} />
        <StatCard icon={Calendar} label="This Month" value={`₹${thisMonthRevenue.toLocaleString()}`} />
        <StatCard icon={TrendingUp} label="Est. MRR" value={`₹${estimatedMRR.toLocaleString()}`} sub={`${proUsers} Pro + ${eliteUsers} Elite`} />
        <StatCard icon={TrendingDown} label="Churn Rate (30d)" value={`${churnRate}%`} sub={`${expiredUsers.length} cancelled`} />
      </div>

      {/* User Plan Counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Users", value: profiles.length, color: "text-foreground", icon: Users },
          { label: "Free Users", value: freeUsers, color: "text-muted-foreground", icon: Users },
          { label: "Pro Users", value: proUsers, color: "text-primary", icon: Zap },
          { label: "Elite Users", value: eliteUsers, color: "text-amber-600", icon: Crown },
          { label: "On Trial", value: trialUsers, color: "text-blue-500", icon: Calendar },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Graph */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-foreground">Monthly Revenue (6 months)</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Most Popular: <span className="font-bold text-primary">{popularPlan}</span></span>
            <Button variant="ghost" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={monthlyRevenueData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Signups */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Daily New Signups (30 days)</h3>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart data={dailySignups}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Plan Distribution Pie */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Plan Distribution</h3>
          <div className="h-[180px] flex items-center justify-center">
            <PieChart width={220} height={180}>
              <Pie data={pieData} cx={110} cy={90} innerRadius={45} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <ChartTooltip />
            </PieChart>
          </div>
        </div>
      </div>

      {/* Projected Revenue */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Projections</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary/50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">₹{estimatedMRR.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Monthly</p>
          </div>
          <div className="bg-secondary/50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">₹{(estimatedMRR * 3).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Quarterly</p>
          </div>
          <div className="bg-secondary/50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">₹{(estimatedMRR * 12).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Yearly</p>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="glass-card overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 20).map(p => {
                const profile = profiles.find(pr => pr.user_id === p.user_id);
                return (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{profile?.email || "Unknown"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.plan === "elite" ? "bg-amber-500/20 text-amber-600" : "bg-primary/20 text-primary"
                      }`}>{p.plan}</span>
                    </td>
                    <td className="p-3 font-mono text-xs text-foreground">₹{p.amount}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "success" || p.status === "captured" ? "bg-green-500/20 text-green-600" :
                        p.status === "pending" ? "bg-amber-500/20 text-amber-600" : "bg-destructive/20 text-destructive"
                      }`}>{p.status.toUpperCase()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {payments.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No payments yet</p>}
      </div>
    </motion.div>
  );
}
