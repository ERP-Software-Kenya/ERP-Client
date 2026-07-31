import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { SimpleTable } from '../components/SimpleTable';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  StockTransfers,
  Organizations,
  Stores,
  Inventory,
  useCompleteStockTransfer,
  useCancelStockTransfer,
  get,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { InventoryItem, StockTransfer } from '../types';

interface HeaderForm {
  organizationId: string;
  fromStoreId: string;
  toStoreId: string;
}

/** Matches CompleteTransferItemRequest exactly. */
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

function emptyHeader(orgId: string): HeaderForm {
  return { organizationId: orgId, fromStoreId: '', toStoreId: '' };
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
    .filter(
      (l) =>
        l.fromInventoryId &&
        l.toInventoryId &&
        l.productId &&
        l.fromLocationId &&
        l.toLocationId &&
        l.quantity,
    )
    .map((l) => ({
      fromInventoryId: l.fromInventoryId,
      toInventoryId: l.toInventoryId,
      productId: l.productId,
      fromLocationId: l.fromLocationId,
      toLocationId: l.toLocationId,
      quantity: Number(l.quantity),
    }));
}

/** Returns an error message if lines cannot be completed, else null. */
function validateLines(lines: LineForm[], inventory: InventoryItem[] | undefined): string | null {
  const items = parseItems(lines);
  if (items.length === 0) {
    return 'Add at least one complete line (from/to inventory + quantity)';
  }
  const byId = new Map((inventory ?? []).map((i) => [i.id, i]));
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!(item.quantity > 0)) return `Line ${i + 1}: quantity must be greater than 0`;
    if (item.fromInventoryId === item.toInventoryId) {
      return `Line ${i + 1}: from and to inventory must be different`;
    }
    const from = byId.get(item.fromInventoryId);
    if (!from) continue; // list not loaded — API will enforce
    const onHand = Number(from.quantityOnHand);
    if (item.quantity > onHand) {
      return `Line ${i + 1}: cannot move ${item.quantity} — from inventory only has ${onHand} on hand`;
    }
    if (from.productId !== item.productId) {
      return `Line ${i + 1}: product does not match from inventory`;
    }
  }
  return null;
}

function isPending(status?: string) {
  return (status ?? '').toUpperCase() === 'PENDING';
}

export default function StockTransfersPage() {
  const { user } = useAuth();
  const sessionOrgId = user?.organization?.id ?? '';
  const recent = useRecentIds(RECENT_NS.stockTransfers);

  const [activeId, setActiveId] = useState<string | undefined>();
  const [lookupId, setLookupId] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);
  const [header, setHeader] = useState(() => emptyHeader(sessionOrgId));
  const [lines, setLines] = useState<LineForm[]>([newLine()]);
  const [busy, setBusy] = useState(false);

  const { data: transfer, isLoading, error, refetch } = StockTransfers.useGet(activeId);
  const { data: inventoryList } = Inventory.useList();
  const { data: stores } = Stores.useList();
  const createMutation = StockTransfers.useCreate();
  const completeMutation = useCompleteStockTransfer();
  const cancelMutation = useCancelStockTransfer();

  const inventoryById = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const i of inventoryList ?? []) m.set(i.id, i);
    return m;
  }, [inventoryList]);

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stores ?? []) m.set(s.id, s.name || s.code || s.id.slice(0, 8));
    return m;
  }, [stores]);

  const recentQueries = useQueries({
    queries: recent.entries.map((e) => ({
      queryKey: ['stock-transfers', e.id] as const,
      queryFn: () => get<StockTransfer>(`/api/v1/stock-transfers/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(() => {
    return recent.entries.map((e, i) => {
      const q = recentQueries[i];
      const data = q?.data;
      return {
        id: e.id,
        label: e.label,
        savedAt: e.savedAt,
        transferNumber: data?.transferNumber,
        status: data?.status,
        fromStoreId: data?.fromStoreId,
        toStoreId: data?.toStoreId,
        loading: q?.isLoading ?? false,
        failed: !!q?.isError,
      };
    });
  }, [recent.entries, recentQueries]);

  const openWizard = () => {
    setHeader(emptyHeader(sessionOrgId));
    setLines([newLine()]);
    setWizardOpen(true);
  };

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter a transfer UUID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const invLabel = (i: InventoryItem) =>
    `${i.productId.slice(0, 8)} @ ${i.locationId.slice(0, 8)} (on hand ${Number(i.quantityOnHand)})`;

  const updateLine = (idx: number, patch: Partial<LineForm>) => {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const selectFromInventory = (idx: number, fromInventoryId: string) => {
    const inv = inventoryById.get(fromInventoryId);
    updateLine(idx, {
      fromInventoryId,
      productId: inv?.productId ?? '',
      fromLocationId: inv?.locationId ?? '',
    });
  };

  const selectToInventory = (idx: number, toInventoryId: string) => {
    const inv = inventoryById.get(toInventoryId);
    updateLine(idx, {
      toInventoryId,
      toLocationId: inv?.locationId ?? '',
      ...(inv && !lines[idx].productId ? { productId: inv.productId } : {}),
    });
  };

  /** One form → POST create then PUT complete. */
  const handleCreateAndComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || createMutation.isPending || completeMutation.isPending) return;
    const organizationId = header.organizationId || sessionOrgId;
    if (!organizationId || !header.fromStoreId || !header.toStoreId) {
      toast.error('Organization, from store, and to store are required');
      return;
    }
    const lineError = validateLines(lines, inventoryList);
    if (lineError) {
      toast.error(lineError);
      return;
    }
    const items = parseItems(lines);

    setBusy(true);
    createMutation.mutate(
      {
        organizationId,
        fromStoreId: header.fromStoreId,
        toStoreId: header.toStoreId,
      },
      {
        onSuccess: (created) => {
          recent.push(created.id, created.transferNumber);
          setActiveId(created.id);
          setLookupId(created.id);
          completeMutation.mutate(
            { id: created.id, items },
            {
              onSuccess: () => {
                setBusy(false);
                setWizardOpen(false);
                setHeader(emptyHeader(sessionOrgId));
                setLines([newLine()]);
                void refetch();
              },
              onError: (err: Error) => {
                setBusy(false);
                setWizardOpen(false);
                toast.error(
                  `Header created (${created.transferNumber}) but stock was not moved: ${err.message}. Open the transfer and use Finish pending with qty ≤ on hand.`,
                );
                void refetch();
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
    if (!transfer || completeMutation.isPending) return;
    const lineError = validateLines(lines, inventoryList);
    if (lineError) {
      toast.error(lineError);
      return;
    }
    const items = parseItems(lines);
    completeMutation.mutate(
      { id: transfer.id, items },
      {
        onSuccess: () => {
          setRetryOpen(false);
          setLines([newLine()]);
          void refetch();
        },
      },
    );
  };

  const handleCancel = () => {
    if (!transfer) return;
    cancelMutation.mutate(transfer.id, { onSuccess: () => void refetch() });
  };

  const linesEditor = (
    <>
      {lines.map((line, idx) => {
        const fromInv = inventoryById.get(line.fromInventoryId);
        const onHand = fromInv != null ? Number(fromInv.quantityOnHand) : undefined;
        return (
          <div key={line.key} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines(lines.filter((l) => l.key !== line.key))}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
            <Field label="From inventory" required hint="Product + from location fill from this row">
              <ResourceSelect
                resource={Inventory}
                getLabel={invLabel}
                value={line.fromInventoryId}
                onValueChange={(fromInventoryId) => selectFromInventory(idx, fromInventoryId)}
              />
            </Field>
            <Field label="To inventory" required hint="Must be a different inventory row (usually same product)">
              <ResourceSelect
                resource={Inventory}
                getLabel={invLabel}
                value={line.toInventoryId}
                onValueChange={(toInventoryId) => selectToInventory(idx, toInventoryId)}
              />
            </Field>
            {(line.productId || line.fromLocationId || line.toLocationId) && (
              <p className="text-xs text-muted-foreground">
                Product {line.productId ? line.productId.slice(0, 8) : '—'}
                {' · '}from loc {line.fromLocationId ? line.fromLocationId.slice(0, 8) : '—'}
                {' · '}to loc {line.toLocationId ? line.toLocationId.slice(0, 8) : '—'}
                {onHand != null ? ` · max ${onHand}` : ''}
              </p>
            )}
            <Field label="Quantity" required hint={onHand != null ? `On hand at source: ${onHand}` : undefined}>
              <Input
                type="number"
                min="0"
                max={onHand != null ? onHand : undefined}
                step="any"
                value={line.quantity}
                onChange={(e) => updateLine(idx, { quantity: e.target.value })}
              />
            </Field>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, newLine()])}>
        <Plus size={15} /> Add line
      </Button>
    </>
  );

  const submitting = busy || createMutation.isPending || completeMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Stock transfers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Header uses Stores. Each line picks from/to inventory (on-hand shown). Submit runs create
            then complete. Recent list is this browser only.
          </p>
        </div>
        <Button onClick={openWizard}>New transfer</Button>
      </div>

      <FormSection title="Recent transfers">
        {listRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent transfers yet. Create one or look up a UUID — it will appear here.
          </p>
        ) : (
          <SimpleTable
            columns={[
              {
                key: 'number',
                header: 'Number',
                render: (r) => r.transferNumber || r.label || '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (r.loading ? '…' : r.failed ? 'unavailable' : r.status ?? '—'),
              },
              {
                key: 'from',
                header: 'From',
                render: (r) =>
                  r.fromStoreId
                    ? storeName.get(r.fromStoreId) ?? r.fromStoreId.slice(0, 8)
                    : '—',
              },
              {
                key: 'to',
                header: 'To',
                render: (r) =>
                  r.toStoreId ? storeName.get(r.toStoreId) ?? r.toStoreId.slice(0, 8) : '—',
              },
              {
                key: 'when',
                header: 'Saved',
                render: (r) => new Date(r.savedAt).toLocaleString(),
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => loadById(r.id)}>
                      Open
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(r.id)}>
                      Remove
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={listRows}
            rowKey={(r) => r.id}
          />
        )}
        {listRows.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => recent.clear()}>
            Clear recent list
          </Button>
        )}
      </FormSection>

      <FormSection title="Look up by UUID">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Transfer UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={() => loadById(lookupId)}>
            Load
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Transfer detail">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !transfer ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Transfer not found.'}
            </p>
          ) : (
            <div className="space-y-4">
              {isPending(transfer.status) && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  Still PENDING — create succeeded but stock was not moved yet. Use Finish pending to
                  send product lines (complete API).
                </div>
              )}
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Number:</span> {transfer.transferNumber}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span> {transfer.status ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">ID:</span> {transfer.id}
                </p>
                <p>
                  <span className="text-muted-foreground">Org:</span> {transfer.organizationId}
                </p>
                <p>
                  <span className="text-muted-foreground">From store:</span> {transfer.fromStoreId}
                </p>
                <p>
                  <span className="text-muted-foreground">To store:</span> {transfer.toStoreId}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setLines([newLine()]);
                    setRetryOpen(true);
                  }}
                  disabled={!isPending(transfer.status)}
                >
                  Finish pending (add products)
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending || !isPending(transfer.status)}
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel transfer'}
                </Button>
              </div>
            </div>
          )}
        </FormSection>
      )}

      <FormDrawer
        open={wizardOpen}
        onClose={() => !submitting && setWizardOpen(false)}
        title="New transfer"
        subtitle="Stores for the header; inventory rows for stock lines (qty cannot exceed on hand)"
        width={640}
        footer={
          <>
            <Button type="submit" form="transfer-wizard-form" disabled={submitting}>
              {submitting ? 'Creating & moving…' : 'Create & move stock'}
            </Button>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => setWizardOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="transfer-wizard-form" onSubmit={handleCreateAndComplete} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            From/To store = sales Stores. Quantity is checked against the from inventory on-hand before
            complete.
          </p>
          <Field label="Organization" required>
            <ResourceSelect
              resource={Organizations}
              getLabel={(o) => o.name ?? o.id.slice(0, 8)}
              value={header.organizationId}
              onValueChange={(v) => setHeader({ ...header, organizationId: v })}
            />
          </Field>
          <Field label="From store" required>
            <ResourceSelect
              resource={Stores}
              getLabel={(s) => s.name}
              value={header.fromStoreId}
              onValueChange={(v) => setHeader({ ...header, fromStoreId: v })}
            />
          </Field>
          <Field label="To store" required>
            <ResourceSelect
              resource={Stores}
              getLabel={(s) => s.name}
              value={header.toStoreId}
              onValueChange={(v) => setHeader({ ...header, toStoreId: v })}
            />
          </Field>
          <div className="border-t border-border pt-3">
            <p className="mb-3 text-sm font-medium">Product lines</p>
            {linesEditor}
          </div>
        </form>
      </FormDrawer>

      <FormDrawer
        open={retryOpen}
        onClose={() => setRetryOpen(false)}
        title="Finish pending transfer"
        subtitle="Complete API only — transfer header already exists"
        width={640}
        footer={
          <>
            <Button type="submit" form="transfer-retry-form" disabled={completeMutation.isPending}>
              {completeMutation.isPending ? 'Completing…' : 'Complete & move stock'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setRetryOpen(false)}>
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
