import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  DollarSign,
  MapPin,
  Package2,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Locations, Products, PurchaseOrders, Suppliers } from '../api';
import type { PurchaseOrder, PurchaseOrderStatus } from '../types';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; cls: string; dot: string }> = {
  draft:             { label: 'Draft',              cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',           dot: 'bg-slate-400' },
  ordered:           { label: 'Ordered',            cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',               dot: 'bg-blue-500' },
  partially_received: { label: 'Partially Received', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',          dot: 'bg-amber-500' },
  received:          { label: 'Received',           cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',   dot: 'bg-emerald-500' },
  cancelled:         { label: 'Cancelled',          cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',                  dot: 'bg-red-500' },
};

function canVerify(status?: PurchaseOrderStatus): boolean {
  return status === 'draft' || status === 'ordered' || status === 'partially_received';
}

function canMarkOrdered(status?: PurchaseOrderStatus): boolean {
  return status === 'draft';
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | Date | undefined | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: PurchaseOrderStatus | undefined }) {
  if (!status || !STATUS_CONFIG[status]) return null;
  const { label, cls, dot } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-base font-semibold text-foreground truncate">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ItemProgress({
  pct,
  fullyReceived,
  hasAny,
}: {
  pct: number;
  fullyReceived: boolean;
  hasAny: boolean;
}) {
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          fullyReceived
            ? 'bg-emerald-500'
            : hasAny
              ? 'bg-amber-500'
              : 'bg-slate-300 dark:bg-slate-600'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: po, isLoading, error } = PurchaseOrders.useGet(id);
  const { data: items = [], isLoading: itemsLoading } = PurchaseOrders.useGetItems(id);
  const { data: products = [] } = Products.useList();
  const { data: suppliers = [] } = Suppliers.useList();
  const { data: locations = [] } = Locations.useList();
  const updateMutation = PurchaseOrders.useUpdate();

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, { name: p.name ?? 'Unnamed', sku: p.sku }])),
    [products],
  );
  const supplier = useMemo(
    () => suppliers.find((s) => s.id === po?.supplierId),
    [suppliers, po?.supplierId],
  );
  const location = useMemo(
    () => locations.find((l) => l.id === po?.locationId),
    [locations, po?.locationId],
  );

  const fullyReceivedCount = useMemo(
    () =>
      items.filter(
        (i) =>
          Number(i.quantityOrdered ?? 0) > 0 &&
          Number(i.quantityReceived ?? 0) >= Number(i.quantityOrdered ?? 0),
      ).length,
    [items],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (error || !po) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-red-500">
        Failed to load purchase order.
      </div>
    );
  }

  const locationLabel = location
    ? `${location.name} (${location.type.charAt(0).toUpperCase() + location.type.slice(1)})`
    : (po.locationId?.slice(0, 8) ?? '—');

  const showActions = canVerify(po.status) || canMarkOrdered(po.status);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/purchase-orders')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Purchase Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {po.poNumber ?? `PO-${po.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <StatusBadge status={po.status} />
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {supplier && (
              <>
                <Building2 size={13} className="shrink-0" />
                <span>{supplier.name}</span>
                <span className="text-border">·</span>
              </>
            )}
            <MapPin size={13} className="shrink-0" />
            <span>{locationLabel}</span>
          </div>
        </div>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                Actions
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canMarkOrdered(po.status) && (
                <DropdownMenuItem
                  onSelect={() =>
                    updateMutation.mutate({ id: po.id, body: { status: 'ordered' } as Partial<PurchaseOrder> })
                  }
                  disabled={updateMutation.isPending}
                >
                  <ShoppingCart size={14} />
                  Mark as Ordered
                </DropdownMenuItem>
              )}
              {canMarkOrdered(po.status) && canVerify(po.status) && (
                <DropdownMenuSeparator />
              )}
              {canVerify(po.status) && (
                <DropdownMenuItem onSelect={() => navigate(`/purchase-orders/${po.id}/receive`)}>
                  <ClipboardCheck size={14} />
                  Verify Receipt
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign size={17} />}
          label="Total Amount"
          value={fmt(po.totalAmount)}
        />
        <StatCard
          icon={<Package2 size={17} />}
          label="Line Items"
          value={itemsLoading ? '…' : String(items.length)}
          sub={
            itemsLoading
              ? undefined
              : `${fullyReceivedCount} / ${items.length} fully received`
          }
        />
        <StatCard
          icon={<Calendar size={17} />}
          label="Created"
          value={fmtDate(po.createdAt)}
        />
        <StatCard
          icon={<Calendar size={17} />}
          label={po.receivedAt ? 'Received On' : 'Expected By'}
          value={po.receivedAt ? fmtDate(po.receivedAt) : fmtDate(po.expectedAt)}
          sub={po.receivedAt ? 'Fully received' : po.expectedAt ? 'Delivery deadline' : undefined}
        />
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Notes: </span>
          {po.notes}
        </div>
      )}

      {/* Line items */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Line Items</h2>
          {!itemsLoading && items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {fullyReceivedCount} / {items.length} fully received
            </span>
          )}
        </div>

        {itemsLoading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading items…
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No line items found for this purchase order.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => {
              const ordered = Number(item.quantityOrdered ?? 0);
              const received = Number(item.quantityReceived ?? 0);
              const remaining = Math.max(0, ordered - received);
              const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
              const fullyReceived = ordered > 0 && received >= ordered;
              const hasAny = received > 0;
              const product = item.productId ? productMap.get(item.productId) : undefined;

              return (
                <div
                  key={item.id}
                  className="px-5 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Product name + SKU */}
                      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        <p className="font-medium text-foreground">
                          {product?.name ?? (item.productId?.slice(0, 8) ?? '—')}
                        </p>
                        {product?.sku && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {product.sku}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <ItemProgress pct={pct} fullyReceived={fullyReceived} hasAny={hasAny} />

                      {/* Stats row */}
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Ordered:{' '}
                          <span className="font-medium text-foreground">{ordered}</span>
                        </span>
                        <span>
                          Received:{' '}
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {received}
                          </span>
                        </span>
                        <span>
                          Remaining:{' '}
                          <span
                            className={`font-medium ${
                              remaining > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {remaining}
                          </span>
                        </span>
                        {item.unitCost != null && (
                          <span>
                            Unit cost:{' '}
                            <span className="font-medium text-foreground">
                              {fmt(item.unitCost)}
                            </span>
                          </span>
                        )}
                        {item.totalCost != null && (
                          <span>
                            Line total:{' '}
                            <span className="font-medium text-foreground">
                              {fmt(item.totalCost)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status icon */}
                    <div className="shrink-0 mt-1">
                      {fullyReceived ? (
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
                          <CheckCircle2 size={16} />
                          <span>Done</span>
                        </div>
                      ) : hasAny ? (
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-medium">
                          <Clock size={16} />
                          <span>{pct}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground/40 text-xs">
                          <XCircle size={16} />
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Received banner */}
      {po.status === 'received' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 px-4 py-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              All items received
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-0.5">
              Stock has been updated in inventory.
              {po.receivedAt && ` Received on ${fmtDate(po.receivedAt)}.`}
            </p>
          </div>
        </div>
      )}

      {/* Cancelled banner */}
      {po.status === 'cancelled' && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 px-4 py-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Order cancelled
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-500 mt-0.5">
              This purchase order has been cancelled. No further actions are available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
