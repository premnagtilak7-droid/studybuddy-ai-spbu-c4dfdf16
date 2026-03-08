import { motion } from "framer-motion";
import { CreditCard, TrendingUp, Calendar, Download, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";

type Profile = {
  user_id: string; email: string; display_name: string | null;
  is_subscribed: boolean; created_at: string;
};

type Props = { profiles: Profile[] };

// Since we don't have actual payment data, we'll simulate based on subscription status
const PLAN_PRICE = 299; // ₹299/month for premium

export default function AdminRevenue({ profiles }: Props) {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const subscribers = profiles.filter(p => p.is_subscribed);
  const totalRevenue = subscribers.length * PLAN_PRICE;
  const thisMonthSubs = subscribers.filter(p => new Date(p.created_at) >= daysAgo(30));
  const thisWeekSubs = subscribers.filter(p => new Date(p.created_at) >= daysAgo(7));
  const todaySubs = subscribers.filter(p => new Date(p.created_at) >= daysAgo(1));

  const monthlyRevenue = thisMonthSubs.length * PLAN_PRICE;
  const weeklyRevenue = thisWeekSubs.length * PLAN_PRICE;
  const todayRevenue = todaySubs.length * PLAN_PRICE;

  // Revenue trend (90 days)
  const revenueTrend = Array.from({ length: 90 }, (_, i) => {
    const date = daysAgo(89 - i);
    const dateStr = date.toISOString().slice(0, 10);
    const newSubs = subscribers.filter(s => s.created_at.slice(0, 10) === dateStr).length;
    return {
      date: i % 7 === 0 ? date.toLocaleDateString("en", { month: "short", day: "numeric" }) : "",
      revenue: newSubs * PLAN_PRICE,
    };
  });

  // Plan breakdown
  const freeUsers = profiles.filter(p => !p.is_subscribed).length;
  const premiumUsers = subscribers.length;
  const pieData = [
    { name: "Free", value: freeUsers },
    { name: "Premium", value: premiumUsers },
  ];
  const COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))"];

  const projectedMonthly = subscribers.length * PLAN_PRICE;

  const exportCSV = () => {
    const headers = ["Email", "Name", "Plan", "Amount", "Join Date"];
    const rows = subscribers.map(s => [s.email, s.display_name || "", "Premium", `₹${PLAN_PRICE}`, new Date(s.created_at).toLocaleDateString()]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "revenue.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const StatCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );

  const chartConfig = { revenue: { label: "Revenue", color: "hsl(var(--primary))" } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="Total Revenue" value={`₹${totalRevenue}`} />
        <StatCard icon={Calendar} label="This Month" value={`₹${monthlyRevenue}`} />
        <StatCard icon={TrendingUp} label="This Week" value={`₹${weeklyRevenue}`} />
        <StatCard icon={CreditCard} label="Today" value={`₹${todayRevenue}`} />
      </div>

      {/* Revenue Chart */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-foreground">Revenue Trend (90 days)</h3>
          <Button variant="ghost" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
        </div>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <LineChart data={revenueTrend}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan Breakdown Pie */}
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Plan Distribution</h3>
          <div className="h-[200px] flex items-center justify-center">
            <PieChart width={200} height={200}>
              <Pie data={pieData} cx={100} cy={100} innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <ChartTooltip />
            </PieChart>
          </div>
        </div>

        {/* Projected Revenue */}
        <div className="glass-card p-4 flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-foreground mb-3">Projected Revenue</h3>
          <div className="space-y-3">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-foreground">₹{projectedMonthly}</p>
              <p className="text-xs text-muted-foreground">Monthly (based on {subscribers.length} active subs × ₹{PLAN_PRICE})</p>
            </div>
            <div className="bg-secondary/50 p-3 rounded-lg">
              <p className="text-2xl font-bold text-foreground">₹{projectedMonthly * 12}</p>
              <p className="text-xs text-muted-foreground">Yearly Projection</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(s => (
                <tr key={s.user_id} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{s.email}</td>
                  <td className="p-3 text-xs text-foreground">Premium</td>
                  <td className="p-3 font-mono text-xs text-foreground">₹{PLAN_PRICE}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="p-3"><span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">ACTIVE</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {subscribers.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No transactions yet</p>}
      </div>
    </motion.div>
  );
}
