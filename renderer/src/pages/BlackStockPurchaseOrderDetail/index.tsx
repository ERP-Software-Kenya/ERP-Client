import { useMemo, useState } from 'react';
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
  Package2,
  RotateCcw,
  ShoppingCart,
  Warehouse,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Locations, Products, UnpublishedStockPurchaseOrders, Suppliers, useUnpublishedStockList } from '../../api';
import { getErrorMessage } from '../../lib/api-error';
import { fmt } from '../pos/posHelpers';
import type {
  BlackPurchaseReturnResult,
  UnpublishedStockPurchaseOrder,
  PurchaseOrderStatus,
  RecordBlackPurchaseReturnRefundInput,
} from '../../types';

type ReturnLineDraft = { quantity: string; reason: string };

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; cls: string; dot: string }> = {
  draft:               { label: 'Draft',               cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',          dot: 'bg-slate-400' },
  ordered:             { label: 'Ordered',             cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',              dot: 'bg-blue-500' },
  partially_received:  { label: 'Partially Received',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',          dot: 'bg-amber-500' },
  received:            { label: 'Received',            cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',  dot: 'bg-emerald-500' },
  partially_allocated: { label: 'Partially Allocated', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',      dot: 'bg-violet-500' },
  allocated:           { label: 'Allocated',           cls: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',             dot: 'bg-teal-500' },
  cancelled:           { label: 'Cancelled',           cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',                 dot: 'bg-red-500' },
};

function canVerify(status?: PurchaseOrderStatus): boolean {
  return (
    status === 'ordered' ||
    status === 'partially_received' ||
    status === 'received' ||
    status === 'partially_allocated'
  );
}

function canMarkOrdered(status?: PurchaseOrderStatus): boolean {
  return status === 'draft';
}

function fmtDate(d: string | Date | undefined | null): string {
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

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function BlackStockPurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [_pdfDownloading, _setPdfDownloading] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnLines, setReturnLines] = useState<Record<string, ReturnLineDraft>>({});
  const [createdReturn, setCreatedReturn] = useState<BlackPurchaseReturnResult | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState<RecordBlackPurchaseReturnRefundInput['paymentMethod']>('CASH');
  const [refundNote, setRefundNote] = useState('');

  const { data: po, isLoading, error } = UnpublishedStockPurchaseOrders.useGet(id);
  const { data: items = [], isLoading: itemsLoading } = UnpublishedStockPurchaseOrders.useGetItems(id);
  const { data: products = [] } = Products.useList();
  const { data: suppliers = [] } = Suppliers.useList();
  const { data: locations = [] } = Locations.useList();
  const { data: unpublishedStock = [] } = useUnpublishedStockList(undefined, { enabled: returnOpen });
  const updateMutation = UnpublishedStockPurchaseOrders.useUpdate();
  const createReturn = UnpublishedStockPurchaseOrders.useCreateReturn();
  const recordReturnRefund = UnpublishedStockPurchaseOrders.useRecordReturnRefund();

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, { name: p.name ?? 'Unnamed', sku: p.sku }])),
    [products],
  );
  const supplier = useMemo(
    () => suppliers.find((s) => s.id === po?.supplierId),
    [suppliers, po?.supplierId],
  );

  const locationMap = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  );

  const returnCandidates = useMemo(() => {
    const purchaseItemsByProduct = new Map<string, typeof items>();
    for (const item of items) {
      if (!item.productId) continue;
      const productItems = purchaseItemsByProduct.get(item.productId) ?? [];
      productItems.push(item);
      purchaseItemsByProduct.set(item.productId, productItems);
    }
    return unpublishedStock.flatMap((stock) => {
      if (Number(stock.quantityOnHand) <= 0) return [];
      return (purchaseItemsByProduct.get(stock.productId) ?? [])
        .filter((item) => Number(item.quantityAllocated ?? 0) > 0)
        .map((item) => ({ stock, item }));
    });
  }, [items, unpublishedStock]);

  const resetReturnForm = () => {
    setReturnLines({});
    setReturnReason('');
    setReturnNotes('');
  };

  const submitReturn = () => {
    if (!id) return;
    const selected = returnCandidates.flatMap(({ stock, item }) => {
      const draft = returnLines[`${item.id}:${stock.locationId}`];
      const quantity = Number(draft?.quantity ?? 0);
      return quantity > 0 ? [{ stock, item, quantity, reason: draft.reason.trim() || undefined }] : [];
    });
    if (selected.length === 0) {
      toast.error('Enter a return quantity for at least one stock line');
      return;
    }
    for (const line of selected) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > Number(line.stock.quantityOnHand)) {
        toast.error('A return quantity exceeds the available black stock');
        return;
      }
    }
    for (const candidate of returnCandidates) {
      const stockTotal = selected
        .filter((line) => line.stock.id === candidate.stock.id)
        .reduce((sum, line) => sum + line.quantity, 0);
      if (stockTotal > Number(candidate.stock.quantityOnHand)) {
        toast.error('Combined return quantities exceed stock available at a location');
        return;
      }
    }
    for (const item of items) {
      const total = selected.filter((line) => line.item.id === item.id).reduce((sum, line) => sum + line.quantity, 0);
      if (total > Number(item.quantityAllocated ?? 0)) {
        toast.error('A return quantity exceeds the quantity allocated from this purchase order');
        return;
      }
    }
    createReturn.mutate({
      id,
      body: {
        reason: returnReason.trim() || undefined,
        notes: returnNotes.trim() || undefined,
        items: selected.map(({ item, stock, quantity, reason }) => ({
          purchaseItemId: item.id,
          locationId: stock.locationId,
          quantity,
          reason,
        })),
      },
    }, {
      onSuccess: (result) => {
        setCreatedReturn(result);
        setReturnOpen(false);
        resetReturnForm();
        setRefundAmount(String(result.totalAmount));
        setRefundOpen(true);
      },
    });
  };

  const submitRefund = () => {
    if (!id || !createdReturn) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Refund amount must be greater than zero');
      return;
    }
    if (amount > Number(createdReturn.totalAmount)) {
      toast.error('Refund cannot exceed the outstanding supplier credit');
      return;
    }
    recordReturnRefund.mutate({
      id,
      returnId: createdReturn.id,
      body: { amount, paymentMethod: refundMethod, note: refundNote.trim() || undefined },
    }, {
      onSuccess: (result) => {
        if (result.outstandingCredit > 0) {
          setRefundAmount(String(result.outstandingCredit));
          setCreatedReturn((current) => current ? { ...current, totalAmount: result.outstandingCredit } : current);
        } else {
          setRefundOpen(false);
          setCreatedReturn(null);
          setRefundNote('');
        }
      },
    });
  };

  const fullyReceivedCount = useMemo(
    () =>
      items.filter(
        (item) =>
          Number(item.quantityOrdered ?? 0) > 0 &&
          Number(item.quantityReceived ?? 0) >= Number(item.quantityOrdered ?? 0),
      ).length,
    [items],
  );

  const fullyAllocatedCount = useMemo(
    () =>
      items.filter(
        (item) =>
          Number(item.quantityReceived ?? 0) > 0 &&
          Number(item.quantityAllocated ?? 0) >= Number(item.quantityReceived ?? 0),
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
        {getErrorMessage(error, 'Unable to load purchase order.')}
      </div>
    );
  }

  const showActions = canVerify(po.status) || canMarkOrdered(po.status);

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/black-stock/purchase-orders')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Black Stock Purchase Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {po.poNumber ?? `BSPO-${po.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <StatusBadge status={po.status} />
          </div>
          {supplier && (
            <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Building2 size={13} className="shrink-0" />
              <span>{supplier.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(po.status === 'allocated' || po.status === 'partially_allocated') && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setReturnOpen(true)}>
              <RotateCcw size={14} /> Return to Supplier
            </Button>
          )}
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
                      updateMutation.mutate({ id: po.id, body: { status: 'ordered' } as Partial<UnpublishedStockPurchaseOrder> })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <ShoppingCart size={14} />
                    Mark as Ordered
                  </DropdownMenuItem>
                )}
                {canMarkOrdered(po.status) && canVerify(po.status) && <DropdownMenuSeparator />}
                {canVerify(po.status) && (
                  <DropdownMenuItem onSelect={() => navigate(`/black-stock/purchase-orders/${po.id}/receive`)}>
                    <ClipboardCheck size={14} />
                    Verify Receipt
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign size={17} />}
          label="Total Amount"
          value={fmt(po.totalAmount ?? 0)}
          sub={po.amountPaid != null && po.amountPaid > 0 ? `${fmt(po.amountPaid)} paid` : undefined}
        />
        <StatCard
          icon={<Package2 size={17} />}
          label="Line Items"
          value={itemsLoading ? '…' : String(items.length)}
          sub={itemsLoading ? undefined : `${fullyReceivedCount} / ${items.length} received`}
        />
        <StatCard icon={<Calendar size={17} />} label="Created" value={fmtDate(po.createdAt)} />
        <StatCard
          icon={<Calendar size={17} />}
          label={po.receivedAt ? 'Received On' : 'Expected By'}
          value={po.receivedAt ? fmtDate(po.receivedAt) : fmtDate(po.expectedAt)}
          sub={po.receivedAt ? 'Goods received' : po.expectedAt ? 'Delivery deadline' : undefined}
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
              {fullyReceivedCount} / {items.length} received · {fullyAllocatedCount} / {items.length} allocated
            </span>
          )}
        </div>

        {itemsLoading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading items…</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No line items found for this purchase order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Unit Cost</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Ordered</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground w-40">Receipt</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground w-40">Allocated</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Pending</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Unallocated</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const ordered = Number(item.quantityOrdered ?? 0);
                  const received = Number(item.quantityReceived ?? 0);
                  const allocated = Number(item.quantityAllocated ?? 0);
                  const remaining = Math.max(0, ordered - received);
                  const unallocated = Math.max(0, received - allocated);
                  const receivePct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
                  const allocatePct = received > 0 ? Math.min(100, Math.round((allocated / received) * 100)) : 0;
                  const fullyReceived = ordered > 0 && received >= ordered;
                  const fullyAllocated = received > 0 && allocated >= received;
                  const product = item.productId ? productMap.get(item.productId) : undefined;

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">
                          {product?.name ?? (item.productId?.slice(0, 8) ?? '—')}
                        </p>
                        {product?.sku && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {product.sku}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                        {item.unitCost != null ? fmt(item.unitCost) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-medium text-foreground">
                        {ordered}
                      </td>
                      <td className="px-4 py-3.5 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar
                              pct={receivePct}
                              color={fullyReceived ? 'bg-emerald-500' : received > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">
                            {received}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ProgressBar
                              pct={allocatePct}
                              color={fullyAllocated ? 'bg-teal-500' : allocated > 0 ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">
                            {allocated}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {remaining > 0
                          ? <span className="font-medium text-amber-600 dark:text-amber-400">{remaining}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {unallocated > 0
                          ? <span className="font-medium text-violet-600 dark:text-violet-400">{unallocated}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {fullyAllocated && fullyReceived ? (
                          <span className="inline-flex items-center gap-1 text-teal-500 text-xs font-medium">
                            <Warehouse size={13} /> Allocated
                          </span>
                        ) : fullyReceived ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-medium">
                            <CheckCircle2 size={13} /> Received
                          </span>
                        ) : received > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-500 text-xs font-medium">
                            <Clock size={13} /> {receivePct}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground/40 text-xs">
                            <XCircle size={13} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status banners */}
      {po.status === 'partially_allocated' && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800/50 dark:bg-violet-950/30 px-4 py-4 flex items-center gap-3">
          <Warehouse size={20} className="text-violet-600 dark:text-violet-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">Partial allocation — stock pending</p>
            <p className="text-xs text-violet-600/80 dark:text-violet-500 mt-0.5">
              Some received stock has not yet been assigned to a location. Open Verify Receipt to complete the allocation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/black-stock/purchase-orders/${po.id}/receive`)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
          >
            Allocate
          </button>
        </div>
      )}

      {po.status === 'received' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 px-4 py-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All items received — assign to locations</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-0.5">
              Goods are in. Open Verify Receipt to assign stock to warehouse locations and update unpublished inventory.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/black-stock/purchase-orders/${po.id}/receive`)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
          >
            Allocate
          </button>
        </div>
      )}

      {po.status === 'allocated' && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 dark:border-teal-800/50 dark:bg-teal-950/30 px-4 py-4 flex items-center gap-3">
          <Warehouse size={20} className="text-teal-600 dark:text-teal-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">Stock fully allocated</p>
            <p className="text-xs text-teal-600/80 dark:text-teal-500 mt-0.5">
              All received stock has been assigned to locations and added to unpublished inventory.
              {po.receivedAt && ` Received on ${fmtDate(po.receivedAt)}.`}
            </p>
          </div>
        </div>
      )}

      {createdReturn && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Supplier credit awaiting refund</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400">
              {createdReturn.returnNumber} · {fmt(createdReturn.totalAmount)} outstanding in the black ledger
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRefundOpen(true)}>Record Refund</Button>
        </div>
      )}

      {po.status === 'cancelled' && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 px-4 py-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Order cancelled</p>
            <p className="text-xs text-red-600/80 dark:text-red-500 mt-0.5">
              This purchase order has been cancelled. No further actions are available.
            </p>
          </div>
        </div>
      )}

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Return Black Stock to Supplier</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This immediately removes stock from the selected black-stock location and creates a credit only in the black ledger.
            </p>
          </DialogHeader>
          <div className="max-h-[45vh] space-y-2 overflow-y-auto">
            {returnCandidates.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No allocated black stock from this order is currently available to return.
              </p>
            ) : returnCandidates.map(({ stock, item }) => {
              const key = `${item.id}:${stock.locationId}`;
              const draft = returnLines[key] ?? { quantity: '', reason: '' };
              const maximum = Math.min(Number(stock.quantityOnHand), Number(item.quantityAllocated ?? 0));
              const product = item.productId ? productMap.get(item.productId) : undefined;
              return (
                <div key={key} className="grid grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] items-end gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{product?.name ?? 'Product'}</p>
                    <p className="text-xs text-muted-foreground">{locationMap.get(stock.locationId) ?? stock.locationId} · {maximum} available</p>
                  </div>
                  <label className="text-xs text-muted-foreground">Quantity
                    <Input type="number" min="0" max={maximum} step="any" value={draft.quantity} onChange={(event) => setReturnLines((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))} />
                  </label>
                  <label className="text-xs text-muted-foreground">Line reason
                    <Input value={draft.reason} onChange={(event) => setReturnLines((current) => ({ ...current, [key]: { ...draft, reason: event.target.value } }))} placeholder="Optional" />
                  </label>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Return reason
              <Input value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Damaged, incorrect goods…" />
            </label>
            <label className="text-xs text-muted-foreground">Notes
              <Textarea value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} placeholder="Optional internal note" rows={2} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button disabled={createReturn.isPending || returnCandidates.length === 0} onClick={submitReturn}>
              {createReturn.isPending ? 'Posting return…' : 'Post Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Supplier Refund</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {createdReturn?.returnNumber ?? 'Return'} created for {fmt(createdReturn?.totalAmount ?? 0)}. Record money received now; partial refunds leave the remaining credit outstanding.
            </p>
          </DialogHeader>
          <label className="text-sm font-medium">Amount
            <Input type="number" min="0" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} />
          </label>
          <label className="text-sm font-medium">Payment method
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={refundMethod} onChange={(event) => setRefundMethod(event.target.value as RecordBlackPurchaseReturnRefundInput['paymentMethod'])}>
              <option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option><option value="NET_BANKING">Net banking</option><option value="CHEQUE">Cheque</option>
            </select>
          </label>
          <label className="text-sm font-medium">Note
            <Textarea rows={2} value={refundNote} onChange={(event) => setRefundNote(event.target.value)} placeholder="Optional payment reference" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Record Later</Button>
            <Button disabled={recordReturnRefund.isPending} onClick={submitRefund}>{recordReturnRefund.isPending ? 'Recording…' : 'Record Refund'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
