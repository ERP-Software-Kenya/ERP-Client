import { useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  XCircle,
  ArrowLeftRight,
  Loader2,
} from 'lucide-react';
import { FormDrawer, Field } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { GuideModal, type GuideStep } from '../components/GuideModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  StockTransfers,
  Inventory,
  Products,
  Locations,
  useCompleteStockTransfer,
  useCancelStockTransfer,
  get,
} from '../api';
import { formatEntityLabel } from '../lib/entityLabel';
import type { InventoryItem, StockTransfer } from '../types';

const GUIDE_KEY = 'guide-stock-transfers-v1';

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <ArrowLeftRight size={16} />,
    title: 'Pick source and destination',
    description: 'Choose the from and to warehouse locations for the transfer header.',
  },
  {
    icon: <Plus size={16} />,
    title: 'Add product lines',
    description: 'For each product, select the source and destination inventory rows and enter the quantity to move.',
  },
  {
    icon: <CheckCircle2 size={16} />,
    title: 'Submit to move stock',
    description: 'One click creates the transfer and immediately moves stock. Pending transfers can be finished or cancelled.',
  },
];

interface HeaderForm {
  fromLocationId: string;
  toLocationId: string;
}

interface LineForm {
  key: string;
  fromInventoryId: string;
  toInventoryId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
}

type CompleteItem = {
  fromInventoryId: string;
  toInventoryId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
};

function emptyHeader(): HeaderForm {
  return { fromLocationId: '', toLocationId: '' };
}

function newLine(): LineForm {
  return {
    key: crypto.randomUUID(),
    fromInventoryId: '',
    toInventoryId: '',
    productId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: '',
  };
}

function parseItems(lines: LineForm[]): CompleteItem[] {
  return lines
    .filter((l) => l.fromInventoryId && l.toInventoryId && l.productId && l.fromLocationId && l.toLocationId && l.quantity)
    .map((l) => ({
      fromInventoryId: l.fromInventoryId,
      toInventoryId: l.toInventoryId,
      productId: l.productId,
      fromLocationId: l.fromLocationId,
      toLocationId: l.toLocationId,
      quantity: Number(l.quantity),
    }));
}

function validateLines(lines: LineForm[], inventory: InventoryItem[] | undefined): string | null {
  const items = parseItems(lines);
  if (items.length === 0) return 'Add at least one complete line (from/to inventory + quantity)';
  const byId = new Map((inventory ?? []).map((i) => [i.id, i]));
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!(item.quantity > 0)) return `Line ${i + 1}: quantity must be greater than 0`;
    if (item.fromInventoryId === item.toInventoryId) return `Line ${i + 1}: source and destination must be different`;
    const from = byId.get(item.fromInventoryId);
    if (!from) continue;
    if (item.quantity > Number(from.quantityOnHand)) {
      return `Line ${i + 1}: cannot move ${item.quantity} — source only has ${from.quantityOnHand} on hand`;
    }
    if (from.productId !== item.productId) return `Line ${i + 1}: product does not match source inventory`;
  }
  return null;
}

function isPending(status?: string) {
  return (status ?? '').toUpperCase() === 'PENDING';
}

function TransferStatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toUpperCase();
  if (s === 'COMPLETED')
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 size={11} />Completed</span>;
  if (s === 'CANCELLED')
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle size={11} />Cancelled</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><AlertCircle size={11} />Pending</span>;
}

interface CardProps {
  transfer: StockTransfer;
  locationMap: Map<string, string>;
  onFinish: (id: string) => void;
  onCancel: (id: string) => void;
  isLoading?: boolean;
}

function TransferCard({ transfer, locationMap, onFinish, onCancel, isLoading }: CardProps) {
  const status = (transfer.status ?? '').toUpperCase();
  const pending = status === 'PENDING';
  const completed = status === 'COMPLETED';
  const cancelled = status === 'CANCELLED';

  const fromName = locationMap.get(transfer.fromLocationId) ?? formatEntityLabel({ id: transfer.fromLocationId });
  const toName = locationMap.get(transfer.toLocationId) ?? formatEntityLabel({ id: transfer.toLocationId });

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-md ${
        cancelled ? 'border-border opacity-60' : 'border-border bg-card'
      }`}
    >
      {/* Card header */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          pending
            ? 'bg-amber-500/8 dark:bg-amber-500/10'
            : completed
              ? 'bg-green-500/8 dark:bg-green-500/10'
              : 'bg-muted/60'
        }`}
      >
        <span className="font-semibold text-foreground">{transfer.transferNumber}</span>
        <TransferStatusBadge status={transfer.status} />
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Pending warning */}
        {pending && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle size={13} className="flex-shrink-0" />
            Stock not moved yet — finish to complete the transfer
          </div>
        )}

        {/* From → To */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-lg bg-muted/70 px-3 py-2 text-center">
            <p className="mb-0.5 text-xs text-muted-foreground">From</p>
            <p className="truncate text-sm font-medium text-foreground">{fromName}</p>
          </div>
          <ArrowRight size={15} className="flex-shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 rounded-lg bg-muted/70 px-3 py-2 text-center">
            <p className="mb-0.5 text-xs text-muted-foreground">To</p>
            <p className="truncate text-sm font-medium text-foreground">{toName}</p>
          </div>
        </div>

        {/* Success state */}
        {completed && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 size={13} />
            Transfer completed successfully
          </div>
        )}

        {/* Actions for pending */}
        {pending && (
          <div className="mt-auto flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onFinish(transfer.id)}
              disabled={isLoading}
            >
              <CheckCircle2 size={13} />
              Finish Pending
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => onCancel(transfer.id)}
              disabled={isLoading}
            >
              <XCircle size={13} />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockTransfersPage() {
  const queryClient = useQueryClient();

  const [guideOpen, setGuideOpen] = useState(() => !localStorage.getItem(GUIDE_KEY));
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [retryId, setRetryId] = useState<string | undefined>();
  const [cancelTargetId, setCancelTargetId] = useState<string | undefined>();
  const [header, setHeader] = useState<HeaderForm>(emptyHeader);
  const [lines, setLines] = useState<LineForm[]>([newLine()]);
  const [busy, setBusy] = useState(false);

  // Keep all session transfers fresh via React Query
  const transferQueries = useQueries({
    queries: sessionIds.map((id) => ({
      queryKey: ['stock-transfers', id] as const,
      queryFn: () => get<StockTransfer>(`/api/v1/stock-transfers/${id}`),
      staleTime: 30_000,
      retry: false,
    })),
  });

  const transfers = useMemo(
    () => transferQueries.map((q) => q.data).filter((t): t is StockTransfer => !!t),
    [transferQueries],
  );

  const { data: inventoryList } = Inventory.useList();
  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();
  const createMutation = StockTransfers.useCreate();
  const completeMutation = useCompleteStockTransfer();
  const cancelMutation = useCancelStockTransfer();

  const inventoryById = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const i of inventoryList ?? []) m.set(i.id, i);
    return m;
  }, [inventoryList]);

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, p.name);
    return m;
  }, [products]);

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) m.set(l.id, l.name);
    return m;
  }, [locations]);

  // Stats from session transfers
  const stats = useMemo(() => ({
    total: sessionIds.length,
    completed: transfers.filter((t) => (t.status ?? '').toUpperCase() === 'COMPLETED').length,
    pending: transfers.filter((t) => (t.status ?? '').toUpperCase() === 'PENDING').length,
  }), [sessionIds.length, transfers]);

  const invLabel = (i: InventoryItem) =>
    `${productMap.get(i.productId) ?? formatEntityLabel({ id: i.productId })} @ ${
      locationMap.get(i.locationId) ?? formatEntityLabel({ id: i.locationId })
    }  (${Number(i.quantityOnHand)} on hand)`;

  const updateLine = (idx: number, patch: Partial<LineForm>) => {
    setLines((prev) => { const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next; });
  };

  const selectFromInventory = (idx: number, fromInventoryId: string) => {
    const inv = inventoryById.get(fromInventoryId);
    updateLine(idx, { fromInventoryId, productId: inv?.productId ?? '', fromLocationId: inv?.locationId ?? '' });
  };

  const selectToInventory = (idx: number, toInventoryId: string) => {
    const inv = inventoryById.get(toInventoryId);
    updateLine(idx, {
      toInventoryId,
      toLocationId: inv?.locationId ?? '',
      ...(inv && !lines[idx].productId ? { productId: inv.productId } : {}),
    });
  };

  const handleCreateAndComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || createMutation.isPending || completeMutation.isPending) return;
    if (!header.fromLocationId || !header.toLocationId) {
      toast.error('From location and to location are required');
      return;
    }
    const lineError = validateLines(lines, inventoryList);
    if (lineError) { toast.error(lineError); return; }
    const items = parseItems(lines);

    setBusy(true);
    createMutation.mutate(
      { fromLocationId: header.fromLocationId, toLocationId: header.toLocationId },
      {
        onSuccess: (created) => {
          setSessionIds((prev) => [created.id, ...prev]);
          completeMutation.mutate(
            { id: created.id, items },
            {
              onSuccess: () => {
                setBusy(false);
                setWizardOpen(false);
                setHeader(emptyHeader());
                setLines([newLine()]);
                void queryClient.invalidateQueries({ queryKey: ['stock-transfers', created.id] });
                toast.success(`Transfer ${created.transferNumber} completed`);
              },
              onError: (err: Error) => {
                setBusy(false);
                setWizardOpen(false);
                void queryClient.invalidateQueries({ queryKey: ['stock-transfers', created.id] });
                toast.error(`Header created (${created.transferNumber}) but stock was not moved: ${err.message}. Use Finish Pending on the card.`);
              },
            },
          );
        },
        onError: () => setBusy(false),
      },
    );
  };

  const handleRetryComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retryId || completeMutation.isPending) return;
    const lineError = validateLines(lines, inventoryList);
    if (lineError) { toast.error(lineError); return; }
    const items = parseItems(lines);
    completeMutation.mutate(
      { id: retryId, items },
      {
        onSuccess: () => {
          setRetryId(undefined);
          setLines([newLine()]);
          void queryClient.invalidateQueries({ queryKey: ['stock-transfers', retryId] });
          toast.success('Transfer completed');
        },
      },
    );
  };

  const handleConfirmCancel = () => {
    if (!cancelTargetId) return;
    cancelMutation.mutate(cancelTargetId, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['stock-transfers', cancelTargetId] });
        setCancelTargetId(undefined);
        toast.success('Transfer cancelled');
      },
    });
  };

  const submitting = busy || createMutation.isPending || completeMutation.isPending;

  const linesEditor = (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const fromInv = inventoryById.get(line.fromInventoryId);
        const onHand = fromInv != null ? Number(fromInv.quantityOnHand) : undefined;
        return (
          <div key={line.key} className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Line {idx + 1}</span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((l) => l.key !== line.key))}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From inventory" required hint="Source — product & location fill automatically">
                <ResourceSelect
                  resource={Inventory}
                  getLabel={invLabel}
                  value={line.fromInventoryId}
                  onValueChange={(id) => selectFromInventory(idx, id)}
                />
              </Field>
              <Field label="To inventory" required hint="Destination — must be a different row">
                <ResourceSelect
                  resource={Inventory}
                  getLabel={invLabel}
                  value={line.toInventoryId}
                  onValueChange={(id) => selectToInventory(idx, id)}
                />
              </Field>
            </div>
            {(line.productId || line.fromLocationId || line.toLocationId) && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {line.productId ? (productMap.get(line.productId) ?? line.productId) : '—'}
                </span>
                {' · '}
                {line.fromLocationId ? (locationMap.get(line.fromLocationId) ?? line.fromLocationId) : '—'}
                <span className="mx-1 text-muted-foreground/50">→</span>
                {line.toLocationId ? (locationMap.get(line.toLocationId) ?? line.toLocationId) : '—'}
                {onHand != null && <span className="ml-1 text-amber-600 dark:text-amber-400">· max {onHand}</span>}
              </p>
            )}
            <div className="mt-3">
              <Field label="Quantity" required hint={onHand != null ? `On hand at source: ${onHand}` : undefined}>
                <Input
                  type="number"
                  min="0"
                  max={onHand ?? undefined}
                  step="any"
                  placeholder="0"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                />
              </Field>
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setLines([...lines, newLine()])}
        className="w-full gap-1.5 border-dashed"
      >
        <Plus size={13} />
        Add another product line
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <GuideModal
        open={guideOpen}
        onClose={() => { localStorage.setItem(GUIDE_KEY, '1'); setGuideOpen(false); }}
        title="Welcome to Stock Transfers"
        description="Move stock between locations by creating a transfer with one or more product lines."
        steps={GUIDE_STEPS}
        tip="Quantities are validated against on-hand stock — you cannot move more than is available at the source."
      />

      <ConfirmDialog
        open={!!cancelTargetId}
        onOpenChange={(open) => { if (!open) setCancelTargetId(undefined); }}
        title="Cancel this transfer?"
        description="This will mark the transfer as cancelled. Any stock already moved cannot be automatically reversed."
        onConfirm={handleConfirmCancel}
        confirmLabel="Yes, cancel transfer"
        confirmVariant="destructive"
        isPending={cancelMutation.isPending}
      />

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Stock Transfers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Move products between warehouse locations with full line-item control.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} className="gap-1.5">
            <HelpCircle size={15} />
            Guide
          </Button>
          <Button
            onClick={() => { setHeader(emptyHeader()); setLines([newLine()]); setWizardOpen(true); }}
            className="gap-1.5"
          >
            <Plus size={15} />
            New Transfer
          </Button>
        </div>
      </div>

      {/* Stats row — only when transfers exist */}
      {sessionIds.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">This Session</p>
            <p className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Completed</p>
            <p className="mt-1.5 text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Pending</p>
            <p className="mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
          </div>
        </div>
      )}

      {/* Transfers grid or empty state */}
      {sessionIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ArrowLeftRight size={28} className="text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No transfers yet</h3>
          <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
            Create a transfer to move products between your warehouse locations.
          </p>
          <Button
            className="mt-5 gap-1.5"
            onClick={() => { setHeader(emptyHeader()); setLines([newLine()]); setWizardOpen(true); }}
          >
            <Plus size={15} />
            Create your first transfer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessionIds.map((id, idx) => {
            const q = transferQueries[idx];
            if (q?.isLoading) {
              return (
                <div key={id} className="flex h-40 items-center justify-center rounded-2xl border border-border bg-card">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              );
            }
            if (!q?.data) {
              return (
                <div key={id} className="flex h-40 items-center justify-center rounded-2xl border border-border bg-card">
                  <p className="text-xs text-muted-foreground">Failed to load</p>
                </div>
              );
            }
            return (
              <TransferCard
                key={id}
                transfer={q.data}
                locationMap={locationMap}
                onFinish={(tid) => { setRetryId(tid); setLines([newLine()]); }}
                onCancel={(tid) => setCancelTargetId(tid)}
                isLoading={cancelMutation.isPending && cancelTargetId === id}
              />
            );
          })}
        </div>
      )}

      {/* New transfer wizard */}
      <FormDrawer
        open={wizardOpen}
        onClose={() => !submitting && setWizardOpen(false)}
        title="New Transfer"
        subtitle="Select locations, then add inventory lines with quantities to move"
        width={640}
        footer={
          <>
            <Button type="submit" form="transfer-wizard-form" disabled={submitting} className="gap-1.5">
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" />Creating & moving…</>
              ) : (
                <><CheckCircle2 size={14} />Create & move stock</>
              )}
            </Button>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setWizardOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="transfer-wizard-form" onSubmit={handleCreateAndComplete} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From location" required>
              <ResourceSelect
                resource={Locations}
                getLabel={(l) => l.name}
                value={header.fromLocationId}
                onValueChange={(v) => setHeader({ ...header, fromLocationId: v })}
              />
            </Field>
            <Field label="To location" required>
              <ResourceSelect
                resource={Locations}
                getLabel={(l) => l.name}
                value={header.toLocationId}
                onValueChange={(v) => setHeader({ ...header, toLocationId: v })}
              />
            </Field>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Product lines</p>
            {linesEditor}
          </div>
        </form>
      </FormDrawer>

      {/* Finish pending drawer */}
      <FormDrawer
        open={!!retryId}
        onClose={() => { setRetryId(undefined); setLines([newLine()]); }}
        title="Finish Pending Transfer"
        subtitle="Add product lines to complete the transfer and move stock"
        width={640}
        footer={
          <>
            <Button type="submit" form="transfer-retry-form" disabled={completeMutation.isPending} className="gap-1.5">
              {completeMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" />Completing…</>
              ) : (
                <><CheckCircle2 size={14} />Complete & move stock</>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setRetryId(undefined); setLines([newLine()]); }}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="transfer-retry-form" onSubmit={handleRetryComplete} className="space-y-4">
          {linesEditor}
        </form>
      </FormDrawer>
    </div>
  );
}
