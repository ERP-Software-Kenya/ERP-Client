import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  FileText,
  Bell,
  AlertTriangle,
  DollarSign,
  Clock,
  ChevronRight,
  BarChart3,
  Layers,
  Wallet,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Users2,
  MapPin,
  Car,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Boxes,
  Truck,
  Activity,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { cn } from '../../lib/utils';
import { useSession } from '../../context/SessionContext';
import {
  Products,
  Suppliers,
  PurchaseOrders,
  Bills,
  PaymentTransactions,
  Notifications,
  Customers,
  Locations,
  StockTransfers,
  useInventoryLowStock,
  useInventoryValuation,
  Inventory,
} from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { PurchaseOrder, Notification as NotificationType, Location, Product } from '../../types';

// ── Chart colour palette ───────────────────────────────────────────────────────

const C = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  purple: '#a855f7',
  rose: '#f43f5e',
  teal: '#14b8a6',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  lime: '#84cc16',
};

const PIE_COLORS = [C.blue, C.green, C.orange, C.rose, C.purple, C.teal];

// ── Demo data (real bucketing requires server-side reporting endpoints) ─────────

const DEMO_REVENUE_TREND = [
  { month: 'Feb', revenue: 284000, cost: 198000 },
  { month: 'Mar', revenue: 342000, cost: 231000 },
  { month: 'Apr', revenue: 298000, cost: 204000 },
  { month: 'May', revenue: 415000, cost: 287000 },
  { month: 'Jun', revenue: 389000, cost: 265000 },
  { month: 'Jul', revenue: 472000, cost: 318000 },
  { month: 'Aug', revenue: 510000, cost: 341000 },
];

const DEMO_VEHICLE_METRICS = [
  { name: 'Active', value: 8, color: C.green },
  { name: 'Maintenance', value: 2, color: C.amber },
  { name: 'Idle', value: 3, color: C.blue },
  { name: 'Retired', value: 1, color: C.rose },
];

const DEMO_VEHICLE_TRIPS = [
  { month: 'Feb', trips: 42 },
  { month: 'Mar', trips: 58 },
  { month: 'Apr', trips: 51 },
  { month: 'May', trips: 67 },
  { month: 'Jun', trips: 73 },
  { month: 'Jul', trips: 69 },
  { month: 'Aug', trips: 81 },
];

// ── Hooks ──────────────────────────────────────────────────────────────────────

function useCountUp(end: number, duration = 1400): number {
  const [count, setCount] = useState(0);
  const endRef = useRef(end);
  endRef.current = end;

  useEffect(() => {
    if (end === 0) { setCount(0); return; }
    let start: number | null = null;
    let raf: number;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(2, -10 * p); // easeOutExpo
      setCount(Math.round(endRef.current * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  return count;
}

function useFadeIn(delay = 0) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return vis;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, iconColor = 'text-muted-foreground' }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className={iconColor} />
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ChartCard({ title, subtitle, children, className }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm p-5', className)}>
      <div className="mb-4">
        <h4 className="font-semibold text-sm">{title}</h4>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartTooltipBox({ active, payload, label, currency }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: boolean; payload?: any[]; label?: string; currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-bold ml-0.5">{currency ? fmt(p.value) : p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function AnimFade({ children, delay = 0, className }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const vis = useFadeIn(delay);
  return (
    <div
      className={cn('transition-all duration-600', vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  label, rawValue, icon: Icon, iconBg, iconColor,
  sublabel, to, format, delay = 0,
}: {
  label: string;
  rawValue: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  sublabel?: string;
  to?: string;
  format?: 'currency' | 'number';
  delay?: number;
}) {
  const count = useCountUp(rawValue);
  const display = format === 'currency' ? fmt(count) : fmtN(count);

  const inner = (
    <AnimFade delay={delay}>
      <div className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 group cursor-default">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{rawValue === 0 ? '…' : display}</p>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
          <div className={cn('p-3 rounded-xl flex-shrink-0 ml-3 transition-transform duration-300 group-hover:scale-110', iconBg)}>
            <Icon size={20} className={iconColor} />
          </div>
        </div>
      </div>
    </AnimFade>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
}

function POBadge({ status }: { status: string | undefined }) {
  const map: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-500',
    ordered: 'bg-blue-500/10 text-blue-500',
    partially_received: 'bg-amber-500/10 text-amber-500',
    received: 'bg-green-500/10 text-green-500',
    cancelled: 'bg-red-500/10 text-red-500',
  };
  const cls = map[status ?? ''] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', cls)}>
      {(status ?? 'unknown').replace('_', ' ')}
    </span>
  );
}

// ── Pie label ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + r * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Tab 1: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: productsData } = Products.useSearch({ limit: 1 });
  const { data: suppliersData } = Suppliers.useSearch({ limit: 1 });
  const { data: poData } = PurchaseOrders.useSearch({ limit: 1 });
  const { data: billsData } = Bills.useSearch({ limit: 1 });
  const { data: customersData } = Customers.useSearch({ limit: 1 });
  const { data: valuation } = useInventoryValuation();
  const { data: notifs, isLoading: notifsLoading } = Notifications.useSearch({ limit: 8 });
  const markReadMutation = Notifications.useMarkRead();
  const { data: pendingPOs, isLoading: pendingLoading } = PurchaseOrders.useSearch({
    limit: 6,
    filters: { status: 'draft' },
  });
  const { data: lowStock, isLoading: lowLoading } = useInventoryLowStock();

  const invValue = useMemo(() => {
    if (!valuation) return 0;
    return valuation.reduce((s, r) => s + (r.averageCost ?? 0) * r.quantityOnHand, 0);
  }, [valuation]);

  const notifList: NotificationType[] = notifs?.items ?? [];
  const pendingList: PurchaseOrder[] = pendingPOs?.items ?? [];
  const lowItems = (lowStock ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 6 KPI cards with count-up animation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Products" rawValue={productsData?.total ?? 0} icon={Package} iconBg="bg-blue-500/10" iconColor="text-blue-500" to="/products" delay={0} />
        <KpiCard label="Suppliers" rawValue={suppliersData?.total ?? 0} icon={Building2} iconBg="bg-violet-500/10" iconColor="text-violet-500" to="/suppliers" delay={80} />
        <KpiCard label="Purchase Orders" rawValue={poData?.total ?? 0} icon={ShoppingCart} iconBg="bg-orange-500/10" iconColor="text-orange-500" to="/purchase-orders" delay={160} />
        <KpiCard label="Bills" rawValue={billsData?.total ?? 0} icon={FileText} iconBg="bg-green-500/10" iconColor="text-green-500" to="/bills" delay={240} />
        <KpiCard label="Customers" rawValue={customersData?.total ?? 0} icon={Users2} iconBg="bg-teal-500/10" iconColor="text-teal-500" to="/customers" delay={320} />
        <KpiCard label="Inventory Value" rawValue={Math.round(invValue)} format="currency" icon={DollarSign} iconBg="bg-amber-500/10" iconColor="text-amber-500" delay={400} />
      </div>

      {/* Low-stock alert */}
      {!lowLoading && lowStock && lowStock.length > 0 && (
        <AnimFade delay={200}>
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 animate-pulse" />
            <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
              <span className="font-semibold">{lowStock.length} SKU{lowStock.length !== 1 ? 's' : ''}</span> below reorder level — action needed
            </p>
            <Link to="/dashboard/inventory" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
              Review <ChevronRight size={12} />
            </Link>
          </div>
        </AnimFade>
      )}

      {/* Notifications + Pending POs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AnimFade delay={100}>
          <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-muted-foreground" />
                <span className="font-semibold text-sm">Notifications</span>
                {notifList.filter((nn) => !nn.readAt).length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
                    {notifList.filter((nn) => !nn.readAt).length}
                  </span>
                )}
              </div>
              <Link to="/notifications" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex-1 divide-y divide-border overflow-auto">
              {notifsLoading ? (
                <p className="p-4 text-sm text-muted-foreground animate-pulse">Loading…</p>
              ) : notifList.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">All caught up</p>
                </div>
              ) : (
                notifList.map((nn, i) => (
                  <button
                    key={nn.id}
                    type="button"
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => { if (!nn.readAt) markReadMutation.mutate(nn.id); }}
                  >
                    <div className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', nn.readAt ? 'bg-muted' : 'bg-primary animate-pulse')} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm truncate', nn.readAt ? 'font-normal text-muted-foreground' : 'font-medium')}>{nn.title ?? 'Notification'}</p>
                      {nn.body && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{nn.body}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{relativeTime(nn.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </AnimFade>

        <AnimFade delay={180}>
          <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col min-h-[320px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-muted-foreground" />
                <span className="font-semibold text-sm">Pending Approvals</span>
              </div>
              <Link to="/purchase-orders" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex-1 divide-y divide-border overflow-auto">
              {pendingLoading ? (
                <p className="p-4 text-sm text-muted-foreground animate-pulse">Loading…</p>
              ) : pendingList.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No pending orders</p>
                </div>
              ) : (
                pendingList.map((po) => (
                  <Link key={po.id} to={`/purchase-orders/${po.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{po.poNumber ?? formatEntityLabel({ id: po.id })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expected {formatDate(po.expectedAt)}{po.totalAmount ? ` · $${po.totalAmount.toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <POBadge status={po.status} />
                      <ChevronRight size={13} className="text-muted-foreground" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </AnimFade>
      </div>

      {/* Low-stock table */}
      {!lowLoading && lowItems.length > 0 && (
        <AnimFade delay={300}>
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                <span className="font-semibold text-sm">Low Stock ({lowStock!.length} SKUs)</span>
              </div>
              <Link to="/dashboard/inventory" className="text-xs text-primary hover:underline flex items-center gap-1">
                Full report <ChevronRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground text-xs">
                    <th className="px-4 py-2.5 font-medium">Product ID</th>
                    <th className="px-4 py-2.5 font-medium">On Hand</th>
                    <th className="px-4 py-2.5 font-medium">Reorder At</th>
                    <th className="px-4 py-2.5 font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {lowItems.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link to={`/inventory/${row.id}`} className="hover:underline font-medium">{formatEntityLabel({ id: row.productId })}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-red-500 font-bold">{row.quantityOnHand}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.reorderLevel}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500 font-medium">-{row.reorderLevel - row.quantityOnHand}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimFade>
      )}
    </div>
  );
}

// ── Tab 2: Analytics ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  // Sales: bill counts by status (real)
  const { data: billCompleted } = Bills.useSearch({ filters: { status: 'COMPLETED' } });
  const { data: billDraft } = Bills.useSearch({ filters: { status: 'DRAFT' } });
  const { data: billInitiated } = Bills.useSearch({ filters: { status: 'INITIATED' } });
  const { data: billCancelled } = Bills.useSearch({ filters: { status: 'CANCELLED' } });

  // PO by status (real)
  const { data: poDraft } = PurchaseOrders.useSearch({ limit: 1, filters: { status: 'draft' } });
  const { data: poOrdered } = PurchaseOrders.useSearch({ limit: 1, filters: { status: 'ordered' } });
  const { data: poPartial } = PurchaseOrders.useSearch({ limit: 1, filters: { status: 'partially_received' } });
  const { data: poReceived } = PurchaseOrders.useSearch({ limit: 1, filters: { status: 'received' } });
  const { data: poCancelled } = PurchaseOrders.useSearch({ limit: 1, filters: { status: 'cancelled' } });

  // Inventory
  const { data: invSearch } = Inventory.useSearch({ limit: 1 });
  const { data: lowStock } = useInventoryLowStock();
  const { data: valuation } = useInventoryValuation();

  // Entities
  const { data: productsList } = Products.useList();
  const { data: locationsList } = Locations.useList();
  const { data: paymentsData } = PaymentTransactions.useSearch({ limit: 1 });

  const totalInventory = invSearch?.total ?? 0;
  const lowCount = lowStock?.length ?? 0;
  const healthyCount = Math.max(0, totalInventory - lowCount);

  // Inventory value by location (computed)
  const inventoryByLocation = useMemo(() => {
    if (!valuation || !locationsList) return [];
    const locMap = new Map<string, string>(locationsList.map((l) => [l.id, l.name]));
    const grouped = new Map<string, number>();
    for (const item of valuation) {
      const v = item.quantityOnHand * (item.averageCost ?? 0);
      grouped.set(item.locationId, (grouped.get(item.locationId) ?? 0) + v);
    }
    return Array.from(grouped.entries())
      .map(([id, value]) => ({ name: locMap.get(id) ?? id.slice(0, 8), value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [valuation, locationsList]);

  // Top products by stock value (computed)
  const topByValue = useMemo(() => {
    if (!valuation || !productsList) return [];
    const pMap = new Map<string, string>(
      productsList.map((p: Product) => [p.id, p.name?.slice(0, 20) ?? p.sku ?? p.id.slice(0, 8)])
    );
    const grouped = new Map<string, number>();
    const qtyMap = new Map<string, number>();
    for (const item of valuation) {
      const v = item.quantityOnHand * (item.averageCost ?? 0);
      grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + v);
      qtyMap.set(item.productId, (qtyMap.get(item.productId) ?? 0) + item.quantityOnHand);
    }
    return Array.from(grouped.entries())
      .map(([id, value]) => ({
        name: pMap.get(id) ?? id.slice(0, 8),
        value: Math.round(value),
        qty: qtyMap.get(id) ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [valuation, productsList]);

  // Top products by quantity (computed)
  const topByQty = useMemo(() => {
    if (!valuation || !productsList) return [];
    const pMap = new Map<string, string>(
      productsList.map((p: Product) => [p.id, p.name?.slice(0, 20) ?? p.sku ?? p.id.slice(0, 8)])
    );
    const grouped = new Map<string, number>();
    for (const item of valuation) {
      grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantityOnHand);
    }
    return Array.from(grouped.entries())
      .map(([id, qty]) => ({ name: pMap.get(id) ?? id.slice(0, 8), qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [valuation, productsList]);

  // Bill status pie data
  const billStatusData = [
    { name: 'Completed', value: billCompleted?.total ?? 0, color: C.green },
    { name: 'Initiated', value: billInitiated?.total ?? 0, color: C.blue },
    { name: 'Draft', value: billDraft?.total ?? 0, color: C.amber },
    { name: 'Cancelled', value: billCancelled?.total ?? 0, color: C.rose },
  ].filter((d) => d.value > 0);

  // PO status pie data
  const poStatusData = [
    { name: 'Received', value: poReceived?.total ?? 0, color: C.green },
    { name: 'Ordered', value: poOrdered?.total ?? 0, color: C.blue },
    { name: 'Partial', value: poPartial?.total ?? 0, color: C.amber },
    { name: 'Draft', value: poDraft?.total ?? 0, color: C.purple },
    { name: 'Cancelled', value: poCancelled?.total ?? 0, color: C.rose },
  ].filter((d) => d.value > 0);

  // Stock health radial
  const stockHealthData = [
    { name: 'Healthy', value: healthyCount, fill: C.green },
    { name: 'Low Stock', value: lowCount, fill: C.rose },
  ];

  const totalInvValue = useMemo(() => {
    if (!valuation) return 0;
    return valuation.reduce((s, r) => s + (r.averageCost ?? 0) * r.quantityOnHand, 0);
  }, [valuation]);

  return (
    <div className="space-y-10">
      {/* ── Sales & Revenue ── */}
      <section>
        <SectionHeader icon={TrendingUp} title="Sales & Revenue" iconColor="text-green-500" />
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Bills by status pie */}
          <AnimFade delay={0}>
            <ChartCard title="Bills by Status" subtitle="Real data · all-time breakdown">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={billStatusData.length ? billStatusData : [{ name: 'No data', value: 1, color: '#e2e8f0' }]}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="value"
                    animationBegin={0} animationDuration={1200} animationEasing="ease-out"
                    labelLine={false}
                    label={(props) => <PieLabel {...props} />}
                  >
                    {(billStatusData.length ? billStatusData : [{ color: '#e2e8f0' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnimFade>

          {/* Revenue trend area chart */}
          <AnimFade delay={80} className="lg:col-span-2">
            <ChartCard title="Revenue vs Cost Trend" subtitle="Demo data — real trend needs server-side bucketing">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={DEMO_REVENUE_TREND}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.orange} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltipBox currency />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={C.green} strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: C.green }} animationDuration={1400} />
                  <Area type="monotone" dataKey="cost" name="Cost" stroke={C.orange} strokeWidth={2} fill="url(#costGrad)" dot={{ r: 3, fill: C.orange }} animationDuration={1600} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnimFade>
        </div>

        {/* Sales KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          <AnimFade delay={0}>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10"><TrendingUp size={18} className="text-green-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Completed Sales</p>
                <p className="text-xl font-bold">{billCompleted?.total ?? '…'}</p>
              </div>
            </div>
          </AnimFade>
          <AnimFade delay={80}>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10"><Activity size={18} className="text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">In-Progress Bills</p>
                <p className="text-xl font-bold">{(billInitiated?.total ?? 0) + (billDraft?.total ?? 0) || '…'}</p>
              </div>
            </div>
          </AnimFade>
          <AnimFade delay={160}>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-500/10"><TrendingDown size={18} className="text-rose-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Cancelled Bills</p>
                <p className="text-xl font-bold">{billCancelled?.total ?? '…'}</p>
              </div>
            </div>
          </AnimFade>
          <AnimFade delay={240}>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-teal-500/10"><Wallet size={18} className="text-teal-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Payments Recorded</p>
                <p className="text-xl font-bold">{paymentsData?.total ?? '…'}</p>
              </div>
            </div>
          </AnimFade>
        </div>
      </section>

      {/* ── Inventory Intelligence ── */}
      <section>
        <SectionHeader icon={Boxes} title="Inventory Intelligence" iconColor="text-blue-500" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <AnimFade delay={0}>
            <KpiCard label="Inventory Records" rawValue={totalInventory} icon={Layers} iconBg="bg-blue-500/10" iconColor="text-blue-500" to="/inventory" />
          </AnimFade>
          <AnimFade delay={80}>
            <KpiCard label="Healthy SKUs" rawValue={healthyCount} icon={CheckCircle2} iconBg="bg-green-500/10" iconColor="text-green-500" />
          </AnimFade>
          <AnimFade delay={160}>
            <KpiCard label="Low-stock SKUs" rawValue={lowCount} icon={AlertTriangle} iconBg="bg-amber-500/10" iconColor="text-amber-500" />
          </AnimFade>
          <AnimFade delay={240}>
            <KpiCard label="Total Stock Value" rawValue={Math.round(totalInvValue)} format="currency" icon={DollarSign} iconBg="bg-green-500/10" iconColor="text-green-500" />
          </AnimFade>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Inventory value by location */}
          <AnimFade delay={0} className="lg:col-span-2">
            <ChartCard title="Inventory Value by Location" subtitle="Real · on-hand qty × average cost per location">
              {inventoryByLocation.length > 0 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={inventoryByLocation} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltipBox currency />} />
                    <Bar dataKey="value" name="Value" fill={C.blue} radius={[6, 6, 0, 0]} animationDuration={1200} animationEasing="ease-out">
                      {inventoryByLocation.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[230px] flex items-center justify-center text-sm text-muted-foreground">No inventory data available</div>
              )}
            </ChartCard>
          </AnimFade>

          {/* Stock health radial */}
          <AnimFade delay={120}>
            <ChartCard title="Stock Health" subtitle="Healthy vs low-stock">
              <ResponsiveContainer width="100%" height={230}>
                <RadialBarChart cx="50%" cy="50%" innerRadius={40} outerRadius={90} data={stockHealthData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} animationDuration={1200} label={false} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltipBox />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnimFade>
        </div>
      </section>

      {/* ── Product Performance ── */}
      <section>
        <SectionHeader icon={Package} title="Product Performance" iconColor="text-purple-500" />
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top products by stock value */}
          <AnimFade delay={0}>
            <ChartCard title="Top Products by Stock Value" subtitle="Real · on-hand qty × average cost per product">
              {topByValue.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart layout="vertical" data={topByValue} margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<ChartTooltipBox currency />} />
                    <Bar dataKey="value" name="Stock Value" fill={C.purple} radius={[0, 6, 6, 0]} animationDuration={1300} animationEasing="ease-out">
                      {topByValue.map((_, i) => (
                        <Cell key={i} fill={`hsl(${270 - i * 12}, 70%, ${55 + i * 3}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No product data available</div>
              )}
            </ChartCard>
          </AnimFade>

          {/* Top products by quantity */}
          <AnimFade delay={100}>
            <ChartCard title="Top Products by Stock Quantity" subtitle="Real · total units on hand across all locations">
              {topByQty.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart layout="vertical" data={topByQty} margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip content={<ChartTooltipBox />} />
                    <Bar dataKey="qty" name="Units" fill={C.teal} radius={[0, 6, 6, 0]} animationDuration={1300} animationEasing="ease-out">
                      {topByQty.map((_, i) => (
                        <Cell key={i} fill={`hsl(${175 + i * 8}, 70%, ${45 + i * 3}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No product data available</div>
              )}
            </ChartCard>
          </AnimFade>
        </div>
      </section>

      {/* ── Procurement ── */}
      <section>
        <SectionHeader icon={ShoppingCart} title="Procurement" iconColor="text-orange-500" />
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimFade delay={0}>
            <ChartCard title="Purchase Orders by Status" subtitle="Real · all-time breakdown">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={poStatusData.length ? poStatusData : [{ name: 'No data', value: 1, color: '#e2e8f0' }]}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="value"
                    animationBegin={0} animationDuration={1200} animationEasing="ease-out"
                    labelLine={false}
                    label={(props) => <PieLabel {...props} />}
                  >
                    {(poStatusData.length ? poStatusData : [{ color: '#e2e8f0' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnimFade>

          <AnimFade delay={100}>
            <ChartCard title="Procurement KPIs" subtitle="Real counts — all-time">
              <div className="space-y-4 mt-2">
                {[
                  { label: 'Draft', value: poDraft?.total ?? 0, color: C.purple, max: (poDraft?.total ?? 0) + (poOrdered?.total ?? 0) + (poReceived?.total ?? 0) + 1 },
                  { label: 'Ordered', value: poOrdered?.total ?? 0, color: C.blue, max: (poDraft?.total ?? 0) + (poOrdered?.total ?? 0) + (poReceived?.total ?? 0) + 1 },
                  { label: 'Partial', value: poPartial?.total ?? 0, color: C.amber, max: (poDraft?.total ?? 0) + (poOrdered?.total ?? 0) + (poReceived?.total ?? 0) + 1 },
                  { label: 'Received', value: poReceived?.total ?? 0, color: C.green, max: (poDraft?.total ?? 0) + (poOrdered?.total ?? 0) + (poReceived?.total ?? 0) + 1 },
                  { label: 'Cancelled', value: poCancelled?.total ?? 0, color: C.rose, max: (poDraft?.total ?? 0) + (poOrdered?.total ?? 0) + (poReceived?.total ?? 0) + 1 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-muted-foreground">{row.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(100, (row.value / row.max) * 100)}%`, background: row.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </AnimFade>
        </div>
      </section>
    </div>
  );
}

// ── Tab 3: Operations ──────────────────────────────────────────────────────────

function OperationsTab() {
  const { data: transfers, isLoading: transfersLoading } = StockTransfers.useSearch({ limit: 8 });
  const { data: locationsList } = Locations.useList();
  const { data: valuation } = useInventoryValuation();

  // Location performance
  const locationPerf = useMemo(() => {
    if (!valuation || !locationsList) return [];
    const locMap = new Map<string, Location>(locationsList.map((l) => [l.id, l]));
    const valMap = new Map<string, number>();
    const qtyMap = new Map<string, number>();
    for (const item of valuation) {
      const v = item.quantityOnHand * (item.averageCost ?? 0);
      valMap.set(item.locationId, (valMap.get(item.locationId) ?? 0) + v);
      qtyMap.set(item.locationId, (qtyMap.get(item.locationId) ?? 0) + item.quantityOnHand);
    }
    return Array.from(locMap.entries()).map(([id, loc]) => ({
      id, name: loc.name, type: loc.type,
      value: Math.round(valMap.get(id) ?? 0),
      qty: qtyMap.get(id) ?? 0,
      isActive: loc.isActive,
    })).sort((a, b) => b.value - a.value);
  }, [valuation, locationsList]);

  const transferList = transfers?.items ?? [];

  return (
    <div className="space-y-10">
      {/* ── Vehicle Fleet ── */}
      <section>
        <SectionHeader icon={Truck} title="Vehicle Fleet" iconColor="text-cyan-500" />
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Fleet status donut (demo) */}
          <AnimFade delay={0}>
            <ChartCard title="Fleet Status" subtitle="Demo data — vehicle module coming soon">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={DEMO_VEHICLE_METRICS}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value"
                    animationBegin={0} animationDuration={1200}
                    labelLine={false}
                    label={(props) => <PieLabel {...props} />}
                  >
                    {DEMO_VEHICLE_METRICS.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnimFade>

          {/* Trip volume (demo) */}
          <AnimFade delay={80} className="lg:col-span-2">
            <ChartCard title="Monthly Trip Volume" subtitle="Demo data — vehicle tracking coming soon">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={DEMO_VEHICLE_TRIPS}>
                  <defs>
                    <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.cyan} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltipBox />} />
                  <Area type="monotone" dataKey="trips" name="Trips" stroke={C.cyan} strokeWidth={2} fill="url(#tripGrad)" dot={{ r: 3, fill: C.cyan }} animationDuration={1300} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </AnimFade>

          {/* Fleet KPI cards */}
          {DEMO_VEHICLE_METRICS.map((v, i) => (
            <AnimFade key={v.name} delay={i * 70}>
              <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ background: `${v.color}18` }}>
                  <Car size={18} style={{ color: v.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{v.name} Vehicles</p>
                  <p className="text-xl font-bold">{v.value}</p>
                </div>
              </div>
            </AnimFade>
          ))}
        </div>

        {/* Vehicle module CTA */}
        <AnimFade delay={200}>
          <div className="mt-4 flex items-center gap-3 px-5 py-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <Zap size={16} className="text-cyan-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Vehicle module is available</p>
              <p className="text-xs text-muted-foreground mt-0.5">Enable the Vehicles module in sidebar settings to access full fleet management — trips, drivers, maintenance, fuel logs, and live tracking.</p>
            </div>
            <Link to="/vehicles" className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 flex-shrink-0">
              Open module <ChevronRight size={12} />
            </Link>
          </div>
        </AnimFade>
      </section>

      {/* ── Stock Transfers ── */}
      <section>
        <SectionHeader icon={ArrowRightLeft} title="Stock Transfers" iconColor="text-indigo-500" />
        <AnimFade delay={0}>
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Recent Transfers</span>
              <Link to="/stock-transfers" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>
            {transfersLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground animate-pulse">Loading transfers…</div>
            ) : transferList.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowRightLeft size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No stock transfers recorded</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transferList.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40 transition-colors">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <ArrowRightLeft size={14} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{formatEntityLabel({ id: t.id })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">#{t.transferNumber}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', t.status === 'completed' ? 'bg-green-500/10 text-green-500' : t.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500')}>
                      {t.status ?? 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimFade>
      </section>

      {/* ── Location Performance ── */}
      <section>
        <SectionHeader icon={MapPin} title="Location Performance" iconColor="text-rose-500" />
        {locationPerf.length > 0 ? (
          <>
            <AnimFade delay={0}>
              <ChartCard title="Stock Value by Location" subtitle="Real · all stores and warehouses">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={locationPerf} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltipBox currency />} />
                    <Bar dataKey="value" name="Stock Value" radius={[6, 6, 0, 0]} animationDuration={1200}>
                      {locationPerf.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </AnimFade>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {locationPerf.slice(0, 6).map((loc, i) => (
                <AnimFade key={loc.id} delay={i * 60}>
                  <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md" style={{ background: `${PIE_COLORS[i % PIE_COLORS.length]}18` }}>
                        <MapPin size={12} style={{ color: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{loc.type}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Stock Value</p>
                        <p className="font-bold">{fmt(loc.value)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Units</p>
                        <p className="font-bold">{loc.qty.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </AnimFade>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center bg-card border border-border rounded-xl text-sm text-muted-foreground">
            No location inventory data available
          </div>
        )}
      </section>
    </div>
  );
}

// ── Root Dashboard ─────────────────────────────────────────────────────────────

type Tab = 'overview' | 'analytics' | 'operations';

export default function Dashboard() {
  const { user, organization } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const orgName = organization?.name ?? 'Your Organization';
  const userName = user?.firstName ?? 'there';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const tabs: { id: Tab; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'operations', icon: Truck, label: 'Operations' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Good {getGreeting()}, {userName}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Building2 size={13} />
            <span className="font-medium">{orgName}</span>
            <span className="text-border">·</span>
            <span>{today}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl self-start sm:self-auto">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div key={activeTab} className="animate-in fade-in duration-300">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'operations' && <OperationsTab />}
      </div>
    </div>
  );
}
