import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Bills, Customers, Locations, Products, SalesReturns } from '../../api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormSelect } from '../../components/FormSelect';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { formatEntityLabel, truncateId } from '../../lib/entityLabel';
import { formatMoney } from '../../lib/format-money';
import { loadErrorMessage } from '../../lib/api-error';
import {
  salesLineReturnableQuantity,
  salesReturnLineTotal,
  toNumber,
} from '../../lib/returns/returnCalculations';
import type {
  Bill,
  BillItem,
  CreateSalesReturnInput,
  SalesReturn,
  SalesReturnItemCondition,
} from '../../types';

interface LineDraft {
  quantity: string;
  condition: SalesReturnItemCondition;
  reason: string;
}

const EMPTY_LINE: LineDraft = { quantity: '', condition: 'restock', reason: '' };

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

export default function SalesReturnsPage() {
  const [billSearch, setBillSearch] = useState('');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [lineDrafts, setLineDrafts] = useState<Record<string, LineDraft>>({});
  const [draftToFinalize, setDraftToFinalize] = useState<SalesReturn | null>(null);

  const { data: billsData, isLoading: billsLoading, isError: billsIsError, error: billsError, refetch: refetchBills } =
    Bills.useSearch({
      search: billSearch.trim() || undefined,
      filters: { status: 'COMPLETED' },
    });
  const { data: selectedBill, isLoading: billLoading } = Bills.useGet(selectedBillId || undefined);
  const { data: historyData, isLoading: historyLoading, isError: historyIsError, error: historyError, refetch: refetchHistory } =
    SalesReturns.useForBill(selectedBillId || undefined);
  const { data: products = [] } = Products.useList();
  const { data: locations = [] } = Locations.useList();
  const { data: customersData } = Customers.useSearch({});

  const createDraft = SalesReturns.useCreateDraft();
  const finalizeReturn = SalesReturns.useFinalize();

  const bills = billsData?.items ?? [];
  const history = historyIsError ? [] : (historyData?.items ?? []);
  const billItems = selectedBill?.items ?? [];

  const productLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      map.set(product.id, formatEntityLabel({ name: product.name, sku: product.sku, id: product.id }));
    }
    return map;
  }, [products]);

  const locationLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const location of locations) {
      map.set(location.id, location.type ? `${location.name} (${location.type})` : location.name);
    }
    return map;
  }, [locations]);

  const customerLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customersData?.items ?? []) {
      map.set(customer.id, formatEntityLabel({ name: customer.name, phone: customer.phone, id: customer.id }));
    }
    return map;
  }, [customersData?.items]);

  useEffect(() => {
    setLineDrafts({});
    setReason('');
    setNotes('');
    setRefundMethod('');
  }, [selectedBillId]);

  const conditionOptions = useMemo(() => {
    const base = [
      { value: 'restock', label: 'Restock' },
      { value: 'damaged', label: 'Damaged' },
    ];
    if (selectedBill?.saleType === 'black') {
      base.push({ value: 'unpublished_restock', label: 'Unpublished Restock' });
    }
    return base;
  }, [selectedBill?.saleType]);

  const selectedLines = useMemo(() => {
    return billItems
      .map((item) => {
        const draft = lineDrafts[item.id] ?? EMPTY_LINE;
        const quantity = toNumber(draft.quantity);
        const returnable = salesLineReturnableQuantity(item, history);
        return {
          item,
          draft,
          quantity,
          returnable,
          lineTotal: quantity > 0 ? salesReturnLineTotal(item, quantity) : 0,
        };
      })
      .filter((line) => line.quantity > 0);
  }, [billItems, history, lineDrafts]);

  const returnTotal = useMemo(
    () => selectedLines.reduce((sum, line) => sum + line.lineTotal, 0),
    [selectedLines],
  );

  const validationMessage = useMemo(() => {
    if (!selectedBill) return 'Select a completed bill to begin.';
    if (selectedBill.status !== 'COMPLETED') return 'Only completed bills can be returned.';
    if (selectedLines.length === 0) return 'Enter a return quantity for at least one line.';
    for (const line of selectedLines) {
      if (line.quantity <= 0) return 'Return quantity must be greater than zero.';
      if (line.quantity > line.returnable) return 'One or more lines exceed the returnable quantity.';
      if (line.draft.condition === 'unpublished_restock' && selectedBill.saleType !== 'black') {
        return 'Unpublished restock is only valid for black sales.';
      }
    }
    return null;
  }, [selectedBill, selectedLines]);

  const updateLine = (item: BillItem, patch: Partial<LineDraft>) => {
    setLineDrafts((current) => ({
      ...current,
      [item.id]: { ...(current[item.id] ?? EMPTY_LINE), ...patch },
    }));
  };

  const handleCreateDraft = () => {
    if (!selectedBill || validationMessage) {
      toast.error(validationMessage ?? 'Return is not ready');
      return;
    }
    const body: CreateSalesReturnInput = {
      billId: selectedBill.id,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      refundMethod: refundMethod || undefined,
      items: selectedLines.map((line) => ({
        billItemId: line.item.id,
        quantity: line.quantity,
        condition: line.draft.condition,
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

  const listError = billsIsError ? loadErrorMessage(billsError, 'completed bills') : null;
  const historyErrorText = historyIsError ? loadErrorMessage(historyError, 'sales return history') : null;

  return (
    <div className="grid h-full min-h-0 grid-cols-[340px_minmax(0,1fr)] gap-4">
      <aside className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={18} />
            <div>
              <h2 className="text-base font-semibold">Sales Returns</h2>
              <p className="text-xs text-muted-foreground">Select a completed bill</p>
            </div>
          </div>
          <div className="relative mt-3">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={billSearch}
              onChange={(event) => setBillSearch(event.target.value)}
              placeholder="Bill number, customer, phone"
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {listError && (
            <div className="space-y-3 p-4 text-sm text-destructive">
              <p>{listError}</p>
              <Button size="sm" variant="outline" onClick={() => void refetchBills()}>Retry</Button>
            </div>
          )}
          {!listError && billsLoading && <p className="p-4 text-sm text-muted-foreground">Loading completed bills…</p>}
          {!listError && !billsLoading && bills.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No completed bills found.</p>
          )}
          {!listError && bills.map((bill: Bill) => (
            <button
              key={bill.id}
              type="button"
              onClick={() => setSelectedBillId(bill.id)}
              className={`mb-2 w-full rounded-md border px-3 py-2 text-left transition-colors ${
                selectedBillId === bill.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">{bill.billNumber || truncateId(bill.id)}</span>
                <span className="text-xs font-semibold tabular-nums">{formatMoney(toNumber(bill.totalAmount))}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">{bill.customerId ? (customerLabel.get(bill.customerId) ?? truncateId(bill.customerId)) : (bill.walkInName ?? 'Walk-in')}</span>
                <span className="uppercase">{bill.saleType ?? 'normal'}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-h-0 flex-col gap-4 overflow-hidden">
        {!selectedBillId ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground">
            Choose a completed bill to prepare a return.
          </div>
        ) : billLoading || !selectedBill ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading bill…</div>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText size={17} />
                    <h1 className="text-lg font-semibold">{selectedBill.billNumber || truncateId(selectedBill.id)}</h1>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">COMPLETED</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Original bill remains unchanged. Stock and credit effects post only when this return is finalized.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Refund / Credit Preview</p>
                  <p className="text-xl font-bold tabular-nums">{formatMoney(returnTotal)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-4">
                <SummaryCell label="Customer" value={selectedBill.customerId ? (customerLabel.get(selectedBill.customerId) ?? truncateId(selectedBill.customerId)) : (selectedBill.walkInName ?? 'Walk-in')} />
                <SummaryCell label="Location" value={locationLabel.get(selectedBill.locationId) ?? truncateId(selectedBill.locationId)} />
                <SummaryCell label="Sale Type" value={<span className="uppercase">{selectedBill.saleType ?? 'normal'}</span>} />
                <SummaryCell label="Bill Total" value={formatMoney(toNumber(selectedBill.totalAmount))} />
              </div>
            </section>

            <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] gap-4 overflow-hidden">
              <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">Returnable Bill Lines</h2>
                  <span className="text-xs text-muted-foreground">{selectedLines.length} selected</span>
                </div>
                <div className="max-h-full overflow-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="sticky top-0 z-10 border-b border-border bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Sold</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Returned</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Returnable</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Condition</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Line Reason</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Preview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {billItems.map((item) => {
                        const draft = lineDrafts[item.id] ?? EMPTY_LINE;
                        const returnable = salesLineReturnableQuantity(item, history);
                        const qty = toNumber(draft.quantity);
                        const over = qty > returnable;
                        return (
                          <tr key={item.id} className={returnable <= 0 ? 'bg-muted/30 text-muted-foreground' : undefined}>
                            <td className="px-3 py-2">
                              <div className="font-medium">{productLabel.get(item.productId) ?? truncateId(item.productId)}</div>
                              <div className="text-xs text-muted-foreground">Unit {formatMoney(toNumber(item.unitPrice))}</div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{toNumber(item.quantity)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{toNumber(item.quantity) - returnable}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{returnable}</td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                max={returnable}
                                disabled={returnable <= 0}
                                value={draft.quantity}
                                onChange={(event) => updateLine(item, { quantity: event.target.value })}
                                className={`ml-auto h-8 w-24 text-right ${over ? 'border-destructive' : ''}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <FormSelect
                                value={draft.condition}
                                onChange={(condition) => updateLine(item, { condition: condition as SalesReturnItemCondition })}
                                options={conditionOptions}
                                disabled={returnable <= 0}
                                className="h-8 w-44 py-1.5"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={draft.reason}
                                disabled={returnable <= 0}
                                onChange={(event) => updateLine(item, { reason: event.target.value })}
                                placeholder="Optional"
                                className="h-8"
                              />
                            </td>
                            <td className={`px-3 py-2 text-right font-semibold tabular-nums ${over ? 'text-destructive' : ''}`}>
                              {qty > 0 ? formatMoney(salesReturnLineTotal(item, Math.min(qty, returnable))) : '—'}
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
                    <FormSelect
                      value={refundMethod}
                      onChange={setRefundMethod}
                      placeholder="Refund method"
                      options={[
                        { value: '', label: 'No cash refund yet' },
                        { value: 'CASH', label: 'Cash' },
                        { value: 'CARD', label: 'Card' },
                        { value: 'UPI', label: 'UPI' },
                        { value: 'CREDIT', label: 'Credit note' },
                      ]}
                    />
                    <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
                    <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal notes" />
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
                      <p className="text-xs text-muted-foreground">No prior returns for this bill.</p>
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
          title="Finalize Sales Return"
          description="Finalize this return and post the configured stock and refund or credit effects. The original bill will remain unchanged."
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
