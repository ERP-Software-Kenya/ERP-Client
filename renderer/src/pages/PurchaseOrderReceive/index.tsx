import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Info,
} from 'lucide-react';
import { Locations, Products, PurchaseOrders, Suppliers } from '../../api';
import type { PurchaseOrderStatus } from '../../types';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  draft:             { label: 'Draft',              cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300' },
  ordered:           { label: 'Ordered',            cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  partially_received: { label: 'Partially Received', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  received:          { label: 'Received',           cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
  cancelled:         { label: 'Cancelled',          cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
};

function canVerify(status?: PurchaseOrderStatus): boolean {
  return status === 'draft' || status === 'ordered' || status === 'partially_received';
}

export default function PurchaseOrderReceive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: po, isLoading, error } = PurchaseOrders.useGet(id);
  const { data: items = [], isLoading: itemsLoading } = PurchaseOrders.useGetItems(id);
  const { data: products = [] } = Products.useList();
  const { data: suppliers = [] } = Suppliers.useList();
  const { data: locations = [] } = Locations.useList();
  const receiveMutation = PurchaseOrders.useReceive();

  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

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

  const getReceiveQty = (itemId: string, remaining: number) =>
    itemId in receiveQtys ? receiveQtys[itemId] : remaining;

  const anyToReceive = items.some((item) => {
    const remaining = Math.max(
      0,
      Number(item.quantityOrdered ?? 0) - Number(item.quantityReceived ?? 0),
    );
    return getReceiveQty(item.id, remaining) > 0;
  });

  const handleReceive = () => {
    if (!id || !po?.locationId) return;
    const receiveItems = items
      .map((item) => {
        const remaining = Math.max(
          0,
          Number(item.quantityOrdered ?? 0) - Number(item.quantityReceived ?? 0),
        );
        return { purchaseItemId: item.id, quantityReceived: getReceiveQty(item.id, remaining) };
      })
      .filter((i) => i.quantityReceived > 0);

    if (receiveItems.length === 0) return;

    receiveMutation.mutate(
      {
        id,
        body: {
          locationId: po.locationId,
          items: receiveItems,
          notes: notes.trim() || undefined,
        },
      },
      { onSuccess: () => navigate(`/purchase-orders/${id}`) },
    );
  };

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

  /* Guard: if not receivable, show a clear message instead of a broken form */
  if (!canVerify(po.status)) {
    return (
      <div className="space-y-5 max-w-3xl">
        <button
          type="button"
          onClick={() => navigate(`/purchase-orders/${id}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Back to {po.poNumber ?? 'Purchase Order'}
        </button>
        <div className="rounded-xl border border-border bg-card px-6 py-14 text-center space-y-3">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
          <p className="text-base font-semibold text-foreground">No further action needed</p>
          <p className="text-sm text-muted-foreground">
            This purchase order is{' '}
            <span className="font-medium text-foreground">{po.status}</span> and cannot be
            modified.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/purchase-orders/${id}`)}
            className="mt-2 inline-flex px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  const locationLabel = location
    ? `${location.name} (${location.type.charAt(0).toUpperCase() + location.type.slice(1)})`
    : (po.locationId?.slice(0, 8) ?? '—');

  const statusCfg = po.status ? STATUS_CONFIG[po.status] : null;

  const pendingCount = items.filter(
    (i) =>
      Math.max(0, Number(i.quantityOrdered ?? 0) - Number(i.quantityReceived ?? 0)) > 0,
  ).length;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => navigate(`/purchase-orders/${id}`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        Back to {po.poNumber ?? 'Purchase Order'}
      </button>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <ClipboardCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h1 className="text-lg font-bold text-foreground">Verify Receipt</h1>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-lg font-semibold text-foreground">
                {po.poNumber ?? po.id.slice(0, 8)}
              </span>
              {statusCfg && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.cls}`}
                >
                  {statusCfg.label}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {supplier?.name ?? '—'}
              <span className="mx-2 text-border">·</span>
              {locationLabel}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Pending items</p>
            <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
          </div>
        </div>

        {/* Partial info strip */}
        {po.status === 'partially_received' && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>
              This order was partially received before. Inputs are pre-filled with remaining
              quantities — adjust any before confirming.
            </span>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Items to Receive</h2>
          <span className="text-xs text-muted-foreground">
            Adjust quantities as needed
          </span>
        </div>

        {itemsLoading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading items…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                    Ordered
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                    Received
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                    Remaining
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                    Receive Now
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const ordered = Number(item.quantityOrdered ?? 0);
                  const received = Number(item.quantityReceived ?? 0);
                  const remaining = Math.max(0, ordered - received);
                  const receiveQty = getReceiveQty(item.id, remaining);
                  const product = item.productId ? productMap.get(item.productId) : undefined;
                  const fullyReceived = ordered > 0 && received >= ordered;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        fullyReceived
                          ? 'opacity-40 bg-muted/10'
                          : 'hover:bg-muted/20'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">
                          {product?.name ?? (item.productId?.slice(0, 8) ?? '—')}
                        </p>
                        {product?.sku && (
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {product.sku}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-foreground">{ordered}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {received}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={
                            remaining > 0
                              ? 'font-medium text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {remaining}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {remaining > 0 ? (
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={receiveQty}
                            onChange={(e) =>
                              setReceiveQtys((prev) => ({
                                ...prev,
                                [item.id]: Math.min(
                                  remaining,
                                  Math.max(0, parseInt(e.target.value, 10) || 0),
                                ),
                              }))
                            }
                            className="w-20 text-right text-sm border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-background ml-auto block"
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1 text-emerald-500">
                            <CheckCircle2 size={14} />
                            <span className="text-xs font-medium">Done</span>
                          </div>
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

      {/* Notes + Submit */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Notes{' '}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Partial delivery, 2 units damaged, re-ordering remainder…"
            className="w-full text-sm border border-border rounded-lg px-3.5 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-background resize-none placeholder:text-muted-foreground/40"
          />
        </div>

        {!po.locationId && (
          <p className="text-xs text-red-500">
            This purchase order has no location assigned — stock cannot be received.
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleReceive}
            disabled={!anyToReceive || receiveMutation.isPending || !po.locationId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardCheck size={16} />
            {receiveMutation.isPending ? 'Processing…' : 'Confirm Receipt'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/purchase-orders/${id}`)}
            className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
