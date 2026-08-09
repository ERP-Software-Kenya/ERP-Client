import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, Users2, ShoppingBag, CheckCircle2, Clock, DollarSign,
} from 'lucide-react';
import { Analytics } from '../../api';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#6366f1','#14b8a6'];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en', { month: 'short' });
}

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ size?: number }>; color: string;
}) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{label}</h3>
        <div className={`p-2 rounded-full ${color}`}><Icon size={16} /></div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SalesDashboard() {
  const { data: summary, isLoading: sLoading } = Analytics.useSalesSummary();
  const { data: trend,   isLoading: tLoading } = Analytics.useRevenueTrend(6);
  const { data: topProd, isLoading: pLoading } = Analytics.useTopProducts(10);
  const { data: topCust, isLoading: cLoading } = Analytics.useTopCustomers(10);

  const loading = (v: boolean, s: string) => (v ? '…' : s);

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Revenue This Month" icon={TrendingUp} color="bg-green-500/10 text-green-500"
          value={loading(sLoading, fmt(summary?.revenueThisMonth ?? 0))} />
        <KpiCard label="Revenue This Week" icon={TrendingUp} color="bg-blue-500/10 text-blue-500"
          value={loading(sLoading, fmt(summary?.revenueThisWeek ?? 0))} />
        <KpiCard label="Avg Bill Value" icon={DollarSign} color="bg-purple-500/10 text-purple-500"
          value={loading(sLoading, fmt(summary?.avgBillValue ?? 0))} />
        <KpiCard label="Active Customers" icon={Users2} color="bg-teal-500/10 text-teal-500"
          value={loading(sLoading, String(summary?.activeCustomers ?? 0))}
          sub="customers with bills in last 30 days" />
        <KpiCard label="Completed Bills" icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-500"
          value={loading(sLoading, String(summary?.completedBills ?? 0))} />
        <KpiCard label="Pending Bills" icon={Clock} color="bg-amber-500/10 text-amber-500"
          value={loading(sLoading, String(summary?.pendingBills ?? 0))} />
      </div>

      {/* Revenue trend */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-green-500" /> Revenue Trend — Last 6 Months
        </h3>
        {tLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} width={60} />
              <Tooltip formatter={(v) => [fmt(Number(v)), 'Revenue']} labelFormatter={fmtMonth} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2}
                fill="url(#revGrad)" dot={{ r: 3 }} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <ShoppingBag size={14} className="text-blue-500" /> Top 10 Products by Revenue
          </h3>
          {pLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (topProd?.length ?? 0) === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, (topProd?.length ?? 0) * 30)}>
              <BarChart data={topProd} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} />
                <YAxis type="category" dataKey="productName" width={100} tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 13)}…` : v} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Revenue']} />
                <Bar dataKey="totalRevenue" radius={[0, 3, 3, 0]} name="Revenue">
                  {(topProd ?? []).map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top customers */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Users2 size={14} className="text-teal-500" /> Top 10 Customers by Spend
          </h3>
          {cLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (topCust?.length ?? 0) === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No customer data yet</div>
          ) : (
            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Customer</th>
                    <th className="text-right pb-2 font-medium">Bills</th>
                    <th className="text-right pb-2 font-medium">Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {(topCust ?? []).map((row, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-1.5 font-medium truncate max-w-[140px]">{row.customerName}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{row.billCount}</td>
                      <td className="py-1.5 text-right font-semibold">{fmt(row.totalSpend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
