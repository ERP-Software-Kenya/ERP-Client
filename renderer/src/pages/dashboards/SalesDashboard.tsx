import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Wallet } from 'lucide-react';
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

function HorizontalProductBar({
  title, data, dataKey, loading, emptyLabel, currencyCode, nameKey = 'productName',
}: {
  title: string;
  data: { productName: string; [key: string]: string | number }[];
  dataKey: string;
  loading: boolean;
  emptyLabel: string;
  currencyCode: string;
  nameKey?: string;
}) {
  const fmt = (n: number) => formatMoney(n, currencyCode);
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      {loading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">{emptyLabel}</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(Number(v))} />
            <YAxis type="category" dataKey={nameKey} width={100} tick={{ fontSize: 10 }}
              tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 13)}…` : v} />
            <Tooltip formatter={(v) => [fmt(Number(v)), title]} />
            <Bar dataKey={dataKey} radius={[0, 3, 3, 0]}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SalesDashboardBody({
  period, locationId, currencyCode,
}: { period: DashboardPeriodRange; locationId?: string; currencyCode: string }) {
  const params = toParams(period, locationId);
  const fmt = (n: number) => formatMoney(n, currencyCode);

  const { data: summary, isLoading: sLoading } = Analytics.useSalesSummary(params);
  const { data: trend, isLoading: tLoading } = Analytics.useRevenueTrend(params);
  const { data: topProd, isLoading: pLoading } = Analytics.useTopProducts({ ...params, limit: 10 });
  const { data: paymentMix, isLoading: payLoading } = Analytics.usePaymentMix(params);
  const { data: demandTiers, isLoading: dLoading } = Analytics.useProductDemandTiers(params);
  const { data: costly, isLoading: costlyLoading } = Analytics.useCostlyProducts({ ...params, limit: 10 });
  const { data: margin, isLoading: marginLoading } = Analytics.useTopMarginProducts({ ...params, limit: 10 });

  const ld = (v: boolean, s: string) => (v ? '…' : s);
  const pieData = (paymentMix ?? []).filter((p) => p.amount > 0);
  const demandPie = (demandTiers ?? []).filter((d) => d.count > 0);

  const topSelling = (topProd ?? []).map((p) => ({
    productName: p.productName,
    totalRevenue: p.totalRevenue,
  }));
  const costlyBars = (costly ?? []).map((p) => ({
    productName: p.productName,
    avgUnitPrice: p.avgUnitPrice,
  }));
  const marginBars = (margin ?? []).map((p) => ({
    productName: p.productName,
    totalMargin: p.totalMargin,
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" icon={TrendingUp} color="bg-green-500/10 text-green-500"
          value={ld(sLoading, fmt(summary?.revenueThisMonth ?? 0))} sub="completed bills in period" />
        <KpiCard label="Avg Bill Value" icon={DollarSign} color="bg-purple-500/10 text-purple-500"
          value={ld(sLoading, fmt(summary?.avgBillValue ?? 0))} />
        <KpiCard label="Completed Bills" icon={ShoppingBag} color="bg-emerald-500/10 text-emerald-500"
          value={ld(sLoading, String(summary?.completedBills ?? 0))} />
        <KpiCard label="Pending Bills" icon={Wallet} color="bg-amber-500/10 text-amber-500"
          value={ld(sLoading, String(summary?.pendingBills ?? 0))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" /> Revenue Trend
          </h3>
          {tLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickFormatter={formatPeriodAxisLabel} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} width={72} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Revenue']} labelFormatter={(label) => formatPeriodAxisLabel(String(label ?? ''))} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2}
                  fill="url(#revGradSales)" dot={{ r: 3 }} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Payment Mix</h3>
          {payLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No payments in period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="amount" nameKey="method" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75} paddingAngle={2}>
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-4">Product Demand</h3>
          {dLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : demandPie.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No sales in period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={demandPie} dataKey="count" nameKey="tier" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75}>
                  {demandPie.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <p className="text-xs text-muted-foreground mt-2">Terciles by units sold in selected period</p>
        </div>

        <HorizontalProductBar title="Top Selling Products" data={topSelling} dataKey="totalRevenue"
          loading={pLoading} emptyLabel="No sales in period" currencyCode={currencyCode} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizontalProductBar title="Costly Products (avg unit price)" data={costlyBars} dataKey="avgUnitPrice"
          loading={costlyLoading} emptyLabel="No priced sales in period" currencyCode={currencyCode} />
        <PermissionGatedChart permission={DASHBOARD_PERMISSIONS.sales.margin}>
          <HorizontalProductBar title="Top Margin Products" data={marginBars} dataKey="totalMargin"
            loading={marginLoading} emptyLabel="No margin data in period" currencyCode={currencyCode} />
        </PermissionGatedChart>
      </div>
    </>
  );
}

export default function SalesDashboard() {
  return (
    <DashboardShell title="Sales Dashboard">
      {(ctx) => <SalesDashboardBody {...ctx} />}
    </DashboardShell>
  );
}
