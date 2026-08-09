import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  DollarSign, ShoppingCart, AlertCircle, TrendingUp, Users2,
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

export default function PurchaseDashboard() {
  const { data: summary, isLoading: sLoading } = Analytics.usePurchaseSummary();
  const { data: trend,   isLoading: tLoading } = Analytics.usePurchaseTrend(6);
  const { data: topSup,  isLoading: supLoading } = Analytics.useTopSuppliers(10);

  const loading = (v: boolean, s: string) => (v ? '…' : s);

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight">Purchase Dashboard</h2>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Spend This Month" icon={DollarSign} color="bg-orange-500/10 text-orange-500"
          value={loading(sLoading, fmt(summary?.spendThisMonth ?? 0))}
          sub="from received purchase orders" />
        <KpiCard label="Outstanding POs" icon={AlertCircle} color="bg-amber-500/10 text-amber-500"
          value={loading(sLoading, String(summary?.outstandingPos ?? 0))}
          sub="ordered or partially received" />
        <KpiCard label="Avg PO Value" icon={TrendingUp} color="bg-blue-500/10 text-blue-500"
          value={loading(sLoading, fmt(summary?.avgPoValue ?? 0))} />
        <KpiCard label="Active Suppliers" icon={Users2} color="bg-teal-500/10 text-teal-500"
          value={loading(sLoading, String(summary?.supplierCount ?? 0))}
          sub="with purchase orders" />
      </div>

      {/* Purchase trend */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <ShoppingCart size={14} className="text-orange-500" /> Purchase Spend Trend — Last 6 Months
        </h3>
        {tLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} width={60} />
              <Tooltip formatter={(v) => [fmt(Number(v)), 'Spend']} labelFormatter={fmtMonth} />
              <Area type="monotone" dataKey="spend" stroke="#f97316" strokeWidth={2}
                fill="url(#poGrad)" dot={{ r: 3 }} name="Spend" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top suppliers */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Users2 size={14} className="text-blue-500" /> Top 10 Suppliers by Spend
        </h3>
        {supLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : (topSup?.length ?? 0) === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No purchase data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, (topSup?.length ?? 0) * 30)}>
            <BarChart data={topSup} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <YAxis type="category" dataKey="supplierName" width={110} tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.length > 15 ? `${v.slice(0, 14)}…` : v} />
              <Tooltip formatter={(v) => [fmt(Number(v)), 'Spend']} />
              <Bar dataKey="totalSpend" radius={[0, 3, 3, 0]} name="Spend">
                {(topSup ?? []).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
