import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, ShoppingCart, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Analytics } from '../../api';
import DashboardShell, { CHART_COLORS } from '../../components/dashboard/DashboardShell';
import PermissionGatedChart from '../../components/dashboard/PermissionGatedChart';
import { DASHBOARD_PERMISSIONS } from '../../config/dashboard-permissions';
import type { DashboardPeriodRange } from '../../components/dashboard/DashboardPeriodFilter';
import { formatPeriodAxisLabel } from '../../lib/dashboard-period';
import { formatMoney } from '../../lib/format-money';

function toParams(period: DashboardPeriodRange, locationId?: string) {
  return { period: period.preset, from: period.from, to: period.to, locationId };
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

function ExceptionBar({ label, count, color, to }: { label: string; count: number; color: string; to: string }) {
  const max = Math.max(count, 1);
  return (
    <Link to={to} className="block group">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium group-hover:text-primary">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (count / max) * 100)}%`, background: color }} />
      </div>
    </Link>
  );
}

function PurchaseDashboardBody({
  period, locationId, currencyCode,
}: { period: DashboardPeriodRange; locationId?: string; currencyCode: string }) {
  const params = toParams(period, locationId);
  const fmt = (n: number) => formatMoney(n, currencyCode);
  const ld = (v: boolean, s: string) => (v ? '…' : s);

  const { data: summary, isLoading: sLoading } = Analytics.usePurchaseSummary(params);
  const { data: trend, isLoading: tLoading } = Analytics.usePurchaseTrend(params);
  const { data: byCategory, isLoading: cLoading } = Analytics.usePurchaseByCategory(params);
  const { data: exceptions, isLoading: eLoading } = Analytics.usePurchaseExceptions({ locationId });
  const { data: supplierPrices, isLoading: spLoading } = Analytics.useSupplierPriceComparison(params);

  const categoryPie = (byCategory ?? []).filter((c) => c.value > 0);

  const supplierBars = useMemo(() => {
    return (supplierPrices ?? []).map((row) => ({
      label: `${row.productName} · ${row.supplierName}`,
      avgUnitCost: row.avgUnitCost,
    }));
  }, [supplierPrices]);

  const maxException = Math.max(
    exceptions?.pending ?? 0,
    exceptions?.approvalPending ?? 0,
    exceptions?.priceIncreased ?? 0,
    1,
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Spend" icon={DollarSign} color="bg-orange-500/10 text-orange-500"
          value={ld(sLoading, fmt(summary?.spendThisMonth ?? 0))} sub="received POs in period" />
        <KpiCard label="Outstanding POs" icon={AlertCircle} color="bg-amber-500/10 text-amber-500"
          value={ld(sLoading, String(summary?.outstandingPos ?? 0))} />
        <KpiCard label="Avg PO Value" icon={TrendingUp} color="bg-blue-500/10 text-blue-500"
          value={ld(sLoading, fmt(summary?.avgPoValue ?? 0))} />
        <KpiCard label="Active Suppliers" icon={ShoppingCart} color="bg-teal-500/10 text-teal-500"
          value={ld(sLoading, String(summary?.supplierCount ?? 0))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <ShoppingCart size={14} className="text-orange-500" /> Purchase Spend Trend
          </h3>
          {tLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="poGradPurchase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickFormatter={formatPeriodAxisLabel} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} width={72} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Spend']} labelFormatter={(label) => formatPeriodAxisLabel(String(label ?? ''))} />
                <Area type="monotone" dataKey="spend" stroke="#f97316" strokeWidth={2}
                  fill="url(#poGradPurchase)" dot={{ r: 3 }} name="Spend" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Spend by Category</h3>
          {cLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : categoryPie.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No purchase data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryPie} dataKey="value" nameKey="categoryName" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75}>
                  {categoryPie.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <PermissionGatedChart permission={DASHBOARD_PERMISSIONS.purchase.supplierPricing}>
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Supplier Price Comparison</h3>
          <p className="text-xs text-muted-foreground mb-3">Products sourced from multiple suppliers in period</p>
          {spLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : supplierBars.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No multi-supplier products in period</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, supplierBars.length * 28)}>
              <BarChart data={supplierBars} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(Number(v))} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 9 }}
                  tickFormatter={(v: string) => v.length > 22 ? `${v.slice(0, 21)}…` : v} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Avg unit cost']} />
                <Bar dataKey="avgUnitCost" radius={[0, 3, 3, 0]}>
                  {supplierBars.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </PermissionGatedChart>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Clock size={14} className="text-amber-500" /> Purchase Exceptions
        </h3>
        {eLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 max-w-2xl">
            <ExceptionBar label="Purchase pending" count={exceptions?.pending ?? 0} color="#3b82f6" to="/purchase-orders" />
            <ExceptionBar label="Approval pending" count={exceptions?.approvalPending ?? 0} color="#f59e0b" to="/purchase-orders" />
            <ExceptionBar label="Price increased" count={exceptions?.priceIncreased ?? 0} color="#ef4444" to="/purchase-orders" />
          </div>
        )}
        {!eLoading && maxException > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            Price increased = same product + supplier with a higher unit cost vs last PO
          </p>
        )}
      </div>
    </>
  );
}

export default function PurchaseDashboard() {
  return (
    <DashboardShell title="Purchase Dashboard">
      {(ctx) => <PurchaseDashboardBody {...ctx} />}
    </DashboardShell>
  );
}
