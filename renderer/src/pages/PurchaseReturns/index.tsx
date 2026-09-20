import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, PackageCheck, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  Inventory,
  Locations,
  Products,
  PurchaseOrders,
  PurchaseReturns,
  Suppliers,
} from '../../api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormSelect } from '../../components/FormSelect';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import { formatMoney } from '../../lib/format-money';
import { loadErrorMessage } from '../../lib/api-error';
import {
  purchaseAllocatedReturnableQuantity,
  purchaseReturnLineTotal,
  purchaseReturnableQuantity,
  purchaseUnallocatedReturnableQuantity,
  toNumber,
} from '../../lib/returns/returnCalculations';
import type {
  CreatePurchaseReturnInput,
  InventoryItem,
  PurchaseItem,
  PurchaseOrder,
  PurchaseReturn,
  PurchaseReturnSourceType,
} from '../../types';

interface LineDraft {
  quantity: string;
  sourceType: PurchaseReturnSourceType;
  locationId: string;
  reason: string;
}

const EMPTY_LINE: LineDraft = {
  quantity: '',
  sourceType: 'unallocated_received',
  locationId: '',
  reason: '',
};

const SOURCE_OPTIONS: Array<{ value: PurchaseReturnSourceType; label: string }> = [
  { value: 'unallocated_received', label: 'Unallocated Received' },
  { value: 'allocated_stock', label: 'Allocated Stock' },
];

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status?: string }) {
  const key = status ?? 'draft';
  const cls: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    finalized: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${cls[key] ?? 'bg-muted text-muted-foreground'}`}>
      {key}
    </span>
  );
}

function SummaryCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[150px]">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function PurchaseReturnsPage() {
  const [poSearch, setPoSearch] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [lineDrafts, setLineDrafts] = useState<Record<string, LineDraft>>({});
  const [draftToFinalize, setDraftToFinalize] = useState<PurchaseReturn | null>(null);

  const {
    data: poData,
    isLoading: poListLoading,
    isError: poListIsError,
    error: poListError,
    refetch: refetchPoList,
  } = PurchaseOrders.useSearch({
    search: poSearch.trim() || undefined,
  });
  const { data: selectedPo, isLoading: poLoading } = PurchaseOrders.useGet(selectedPoId || undefined);
  const { data: purchaseItems = [], isLoading: itemsLoading } = PurchaseOrders.useGetItems(selectedPoId || undefined);
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyIsError,
    error: historyError,
    refetch: refetchHistory,
  } = PurchaseReturns.useForPurchaseOrder(selectedPoId || undefined);
  const { data: suppliers = [] } = Suppliers.useList();
  const { data: products = [] } = Products.useList();
  const { data: locations = [] } = Locations.useList();
  const { data: inventory = [] } = Inventory.useList();

  const createDraft = PurchaseReturns.useCreateDraft();
  const finalizeReturn = PurchaseReturns.useFinalize();

  const purchaseOrders = poData?.items ?? [];
  const history = historyIsError ? [] : (historyData?.items ?? []);

  const supplierLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const supplier of suppliers) {
      map.set(supplier.id, formatEntityLabel({ name: supplier.name, phone: supplier.phone, id: supplier.id }));
    }
    return map;
  }, [suppliers]);

  const productLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.id, formatEntityLabel({ name: product.name, sku: product.sku, id: product.id }));
    }
    return map;
  }, [products]);

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({
        value: location.id,
        label: location.type ? `${location.name} (${location.type})` : location.name,
      })),
    [locations],
  );

  const inventoryByProductLocation = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of inventory) {
      map.set(`${item.productId}:${item.locationId}`, item);
    }
    return map;
  }, [inventory]);

  useEffect(() => {
    setLineDrafts({});
    setReason('');
    setNotes('');
  }, [selectedPoId]);

  const updateLine = (item: PurchaseItem, patch: Partial<LineDraft>) => {
    setLineDrafts((current) => ({
      ...current,
      [item.id]: { ...(current[item.id] ?? EMPTY_LINE), ...patch },
    }));
  };

  const selectedLines = useMemo(() => {
    return purchaseItems
      .map((item) => {
        const draft = lineDrafts[item.id] ?? EMPTY_LINE;
        const quantity = toNumber(draft.quantity);
        const inventoryItem =
          item.productId && draft.locationId
            ? inventoryByProductLocation.get(`${item.productId}:${draft.locationId}`)
            : undefined;
        const returnable =
          draft.sourceType === 'allocated_stock'
            ? purchaseAllocatedReturnableQuantity(item, history, inventoryItem)
            : purchaseUnallocatedReturnableQuantity(item, history);
        return {
          item,
          draft,
          quantity,
          returnable,
          lineTotal: quantity > 0 ? purchaseReturnLineTotal(item, quantity) : 0,
        };
      })
      .filter((line) => line.quantity > 0);
  }, [history, inventoryByProductLocation, lineDrafts, purchaseItems]);

  const returnTotal = useMemo(
    () => selectedLines.reduce((sum, line) => sum + line.lineTotal, 0),
    [selectedLines],
  );

  const receivedCount = purchaseItems.reduce((sum, item) => sum + toNumber(item.quantityReceived), 0);
  const allocatedCount = purchaseItems.reduce((sum, item) => sum + toNumber(item.quantityAllocated), 0);
  const returnableCount = purchaseItems.reduce((sum, item) => sum + purchaseReturnableQuantity(item, history), 0);

  const validationMessage = useMemo(() => {
    if (!selectedPo) return 'Select a purchase order to begin.';
    if (selectedLines.length === 0) return 'Enter a return quantity for at least one line.';
    for (const line of selectedLines) {
      if (line.quantity <= 0) return 'Return quantity must be greater than zero.';
      if (line.quantity > line.returnable) return 'One or more lines exceed the returnable quantity.';
      if (line.draft.sourceType === 'allocated_stock' && !line.draft.locationId) {
        return 'Location is required for allocated stock returns.';
      }
    }
    return null;
  }, [selectedLines, selectedPo]);

  const handleCreateDraft = () => {
    if (!selectedPo || validationMessage) {
      toast.error(validationMessage ?? 'Return is not ready');
      return;
    }
    const body: CreatePurchaseReturnInput = {
      purchaseOrderId: selectedPo.id,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      items: selectedLines.map((line) => ({
        purchaseItemId: line.item.id,
        quantity: line.quantity,
        sourceType: line.draft.sourceType,
        locationId: line.draft.sourceType === 'allocated_stock' ? line.draft.locationId : undefined,
        reason: line.draft.reason.trim() || undefined,
      })),
    };
    createDraft.mutate(body, {
      onSuccess: (created) => {
        setDraftToFinalize(created);
        void refetchHistory();
      },
    });
  };

  const finalizeDraft = () => {
    if (!draftToFinalize) return;
    finalizeReturn.mutate(draftToFinalize.id, {
      onSuccess: () => {
        setDraftToFinalize(null);
        setLineDrafts({});
        void refetchHistory();
      },
    });
  };

  const poListErrorText = poListIsError ? loadErrorMessage(poListError, 'purchase orders') : null;
  const historyErrorText = historyIsError ? loadErrorMessage(historyError, 'purchase return history') : null;

  return (
    <div className="grid h-full min-h-0 grid-cols-[340px_minmax(0,1fr)] gap-4">
      <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} />
            <div>
              <h2 className="text-base font-semibold">Purchase Returns</h2>
              <p className="text-xs text-muted-foreground">Select a received purchase order</p>
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={poSearch}
              onChange={(event) => setPoSearch(event.target.value)}
              placeholder="PO number or supplier"
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {poListErrorText && (
            <div className="space-y-3 p-4 text-sm text-destructive">
              <p>{poListErrorText}</p>
              <Button size="sm" variant="outline" onClick={() => void refetchPoList()}>Retry</Button>
            </div>
          )}
          {!poListErrorText && poListLoading && <p className="p-4 text-sm text-muted-foreground">Loading purchase orders…</p>}
          {!poListErrorText && !poListLoading && purchaseOrders.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No purchase orders found.</p>
          )}
          {!poListErrorText && purchaseOrders.map((po: PurchaseOrder) => (
            <button
              key={po.id}
              type="button"
              onClick={() => setSelectedPoId(po.id)}
              className={`mb-2 w-full rounded-md border px-3 py-2 text-left transition-colors ${
                selectedPoId === po.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">{po.poNumber || truncateId(po.id)}</span>
                <span className="text-xs font-semibold tabular-nums">{formatMoney(toNumber(po.totalAmount))}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{po.supplierId ? (supplierLabel.get(po.supplierId) ?? truncateId(po.supplierId)) : 'Supplier missing'}</span>
                <span className="uppercase">{po.status ?? 'draft'}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-h-0 flex-col gap-4 overflow-hidden">
        {!selectedPoId ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground">
            Choose a purchase order to prepare a supplier return.
          </div>
        ) : poLoading || !selectedPo ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading purchase order…</div>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <PackageCheck size={17} />
                    <h1 className="text-lg font-semibold">{selectedPo.poNumber || truncateId(selectedPo.id)}</h1>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-blue-700">
                      {selectedPo.status ?? 'draft'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Draft creation does not touch PO quantities or inventory. Finalization posts the selected reversal path.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Supplier Debit Preview</p>
                  <p className="text-xl font-bold tabular-nums">{formatMoney(returnTotal)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-5">
                <SummaryCell label="Supplier" value={selectedPo.supplierId ? (supplierLabel.get(selectedPo.supplierId) ?? truncateId(selectedPo.supplierId)) : '—'} />
                <SummaryCell label="PO Total" value={formatMoney(toNumber(selectedPo.totalAmount))} />
                <SummaryCell label="Received Qty" value={receivedCount} />
                <SummaryCell label="Allocated Qty" value={allocatedCount} />
                <SummaryCell label="Returnable Qty" value={returnableCount} />
              </div>
            </section>

            <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-4 overflow-hidden">
              <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">Purchase Lines</h2>
                  <span className="text-xs text-muted-foreground">{selectedLines.length} selected</span>
                </div>
                <div className="max-h-full overflow-auto">
                  <table className="w-full min-w-[1080px] text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Received</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Allocated</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Unallocated</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Source</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Location</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Max</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Line Reason</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {itemsLoading && (
                        <tr>
                          <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-foreground">Loading items…</td>
                        </tr>
                      )}
                      {!itemsLoading && purchaseItems.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-foreground">No received line items found.</td>
                        </tr>
                      )}
                      {!itemsLoading && purchaseItems.map((item) => {
                        const draft = lineDrafts[item.id] ?? EMPTY_LINE;
                        const inventoryItem =
                          item.productId && draft.locationId
                            ? inventoryByProductLocation.get(`${item.productId}:${draft.locationId}`)
                            : undefined;
                        const sourceMax =
                          draft.sourceType === 'allocated_stock'
                            ? purchaseAllocatedReturnableQuantity(item, history, inventoryItem)
                            : purchaseUnallocatedReturnableQuantity(item, history);
                        const qty = toNumber(draft.quantity);
                        const over = qty > sourceMax;
                        const received = toNumber(item.quantityReceived);
                        const allocated = toNumber(item.quantityAllocated);
                        const unallocated = Math.max(0, received - allocated);
                        return (
                          <tr key={item.id} className={received <= 0 ? 'bg-muted/30 text-muted-foreground' : undefined}>
                            <td className="px-3 py-2">
                              <div className="font-medium">{item.productId ? (productLabel.get(item.productId) ?? truncateId(item.productId)) : 'Product missing'}</div>
                              <div className="text-xs text-muted-foreground">Unit cost {formatMoney(toNumber(item.unitCost))}</div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{received}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{allocated}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{unallocated}</td>
                            <td className="px-3 py-2">
                              <FormSelect
                                value={draft.sourceType}
                                onChange={(sourceType) => updateLine(item, {
                                  sourceType: sourceType as PurchaseReturnSourceType,
                                  locationId: sourceType === 'allocated_stock' ? draft.locationId : '',
                                })}
                                options={SOURCE_OPTIONS}
                                disabled={received <= 0}
                                className="h-8 w-48 py-1.5"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <FormSelect
                                value={draft.locationId}
                                onChange={(locationId) => updateLine(item, { locationId })}
                                options={[{ value: '', label: 'Select location' }, ...locationOptions]}
                                disabled={received <= 0 || draft.sourceType !== 'allocated_stock'}
                                className={`h-8 w-48 py-1.5 ${draft.sourceType === 'allocated_stock' && qty > 0 && !draft.locationId ? 'border-destructive' : ''}`}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{sourceMax}</td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                max={sourceMax}
                                disabled={received <= 0}
                                value={draft.quantity}
                                onChange={(event) => updateLine(item, { quantity: event.target.value })}
                                className={`ml-auto h-8 w-24 text-right ${over ? 'border-destructive' : ''}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={draft.reason}
                                disabled={received <= 0}
                                onChange={(event) => updateLine(item, { reason: event.target.value })}
                                placeholder="Optional"
                                className="h-8"
                              />
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold tabular-nums ${over ? 'text-destructive' : ''}`}>
                              {qty > 0 ? formatMoney(purchaseReturnLineTotal(item, Math.min(qty, sourceMax))) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h2 className="text-sm font-semibold">Return Details</h2>
                  <div className="mt-3 space-y-3">
                    <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
                    <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dispatch / supplier notes" />
                  </div>
                  {validationMessage && (
                    <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <span>{validationMessage}</span>
                    </div>
                  )}
                  <Button
                    className="mt-4 w-full"
                    disabled={createDraft.isPending || !!validationMessage}
                    onClick={handleCreateDraft}
                  >
                    <CheckCircle2 size={15} />
                    {createDraft.isPending ? 'Creating Draft…' : 'Create Draft'}
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-card">
                  <div className="border-b border-border px-4 py-3">
                    <h2 className="text-sm font-semibold">Return History</h2>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-3">
                    {historyErrorText && <p className="text-xs text-destructive">{historyErrorText}</p>}
                    {!historyErrorText && historyLoading && <p className="text-xs text-muted-foreground">Loading history…</p>}
                    {!historyErrorText && !historyLoading && history.length === 0 && (
                      <p className="text-xs text-muted-foreground">No prior returns for this purchase order.</p>
                    )}
                    {!historyErrorText && history.map((ret) => (
                      <div key={ret.id} className="mb-2 rounded-md border border-border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold">{ret.returnNumber ?? truncateId(ret.id)}</span>
                          <StatusBadge status={ret.status} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDateTime(ret.finalizedAt ?? ret.createdAt)}</span>
                          <span className="font-semibold tabular-nums">{formatMoney(toNumber(ret.totalAmount))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </>
        )}

        <ConfirmDialog
          open={!!draftToFinalize}
          onOpenChange={(open) => !open && setDraftToFinalize(null)}
          title="Finalize Purchase Return"
          description="Finalize this return and post the selected received-quantity or inventory reversal. The purchase order total and status remain unchanged."
          confirmLabel="Finalize Return"
          pendingLabel="Finalizing…"
          confirmVariant="default"
          isPending={finalizeReturn.isPending}
          onConfirm={finalizeDraft}
        >
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-mono">{draftToFinalize?.returnNumber ?? (draftToFinalize ? truncateId(draftToFinalize.id) : '—')}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatMoney(toNumber(draftToFinalize?.totalAmount ?? returnTotal))}</span>
            </div>
          </div>
        </ConfirmDialog>
      </main>
    </div>
  );
}
