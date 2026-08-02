import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { RecentRecords } from '../components/RecentRecords';
import { ResourceSelect } from '../components/ResourceSelect';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  StockTransfers,
  Organizations,
  Inventory,
  Products,
  Locations,
  useCompleteStockTransfer,
  useCancelStockTransfer,
  get,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { formatEntityLabel, truncateId } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { InventoryItem, StockTransfer } from '../types';

interface HeaderForm {
  organizationId: string;
  fromLocationId: string;
  toLocationId: string;
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
  return { organizationId: orgId, fromLocationId: '', toLocationId: '' };
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
  const { data: orgs } = Organizations.useList();
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

  const orgName = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgs ?? []) {
      m.set(o.id, formatEntityLabel({ name: o.name, id: o.id }));
    }
    return m;
  }, [orgs]);

  const productName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) {
      m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    }
    return m;
  }, [products]);

  const locationName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }));
    }
    return m;
  }, [locations]);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['stock-transfers', e.id] as const,
      queryFn: () => get<StockTransfer>(`/api/v1/stock-transfers/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(() => {
    return recent.entries.map((e, i) => {
      const q = i < HYDRATE_LIMIT ? recentQueries[i] : undefined;
      const data = q?.data;
      return {
        id: e.id,
        label: e.label,
        savedAt: e.savedAt,
        transferNumber: data?.transferNumber,
        status: data?.status,
        fromLocationId: data?.fromLocationId,
        toLocationId: data?.toLocationId,
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
      toast.error('Enter a transfer ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const invLabel = (i: InventoryItem) =>
    `${productName.get(i.productId) ?? formatEntityLabel({ id: i.productId })} @ ${
      locationName.get(i.locationId) ?? formatEntityLabel({ id: i.locationId })
    } (on hand ${Number(i.quantityOnHand)})`;

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
    if (!organizationId || !header.fromLocationId || !header.toLocationId) {
      toast.error('Organization, from location, and to location are required');
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
        fromLocationId: header.fromLocationId,
        toLocationId: header.toLocationId,
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
                Product{' '}
                {line.productId
                  ? productName.get(line.productId) ?? formatEntityLabel({ id: line.productId })
                  : '—'}
                {' · '}from loc{' '}
                {line.fromLocationId
                  ? locationName.get(line.fromLocationId) ?? formatEntityLabel({ id: line.fromLocationId })
                  : '—'}
                {' · '}to loc{' '}
                {line.toLocationId
                  ? locationName.get(line.toLocationId) ?? formatEntityLabel({ id: line.toLocationId })
                  : '—'}
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
            Header uses Locations. Each line picks from/to inventory (on-hand shown). Submit runs create
            then complete. Recent list is this browser only.
          </p>
        </div>
        <Button onClick={openWizard}>New transfer</Button>
      </div>

      <RecentRecords
        title="Recent transfers"
        emptyHint="No recent transfers yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
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
              r.fromLocationId ? locationName.get(r.fromLocationId) ?? formatEntityLabel({ id: r.fromLocationId }) : '—',
          },
          {
            key: 'to',
            header: 'To',
            render: (r) =>
              r.toLocationId ? locationName.get(r.toLocationId) ?? formatEntityLabel({ id: r.toLocationId }) : '—',
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
        rowKey={(r) => r.id}
        onClear={recent.clear}
      />

      <AdvancedIdLookup
        entityLabel="transfer"
        value={lookupId}
        onChange={setLookupId}
        onLoad={() => loadById(lookupId)}
      />

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
                  <span className="text-muted-foreground">ID:</span> {truncateId(transfer.id)}
                </p>
                <p>
                  <span className="text-muted-foreground">Org:</span>{' '}
                  {orgName.get(transfer.organizationId) ??
                    formatEntityLabel({ id: transfer.organizationId })}
                </p>
                <p>
                  <span className="text-muted-foreground">From location:</span>{' '}
                  {locationName.get(transfer.fromLocationId) ??
                    formatEntityLabel({ id: transfer.fromLocationId })}
                </p>
                <p>
                  <span className="text-muted-foreground">To location:</span>{' '}
                  {locationName.get(transfer.toLocationId) ?? formatEntityLabel({ id: transfer.toLocationId })}
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
        subtitle="Locations for the header; inventory rows for stock lines (qty cannot exceed on hand)"
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
            From/To location = warehouse or store Locations. Quantity is checked against the from
            inventory on-hand before complete.
          </p>
          <Field label="Organization" required>
            <ResourceSelect
              resource={Organizations}
              getLabel={(o) => formatEntityLabel({ name: o.name, id: o.id })}
              value={header.organizationId}
              onValueChange={(v) => setHeader({ ...header, organizationId: v })}
            />
          </Field>
          <Field label="From location" required>
            <ResourceSelect
              resource={Locations}
              getLabel={(s) => s.name}
              value={header.fromLocationId}
              onValueChange={(v) => setHeader({ ...header, fromLocationId: v })}
            />
          </Field>
          <Field label="To location" required>
            <ResourceSelect
              resource={Locations}
              getLabel={(s) => s.name}
              value={header.toLocationId}
              onValueChange={(v) => setHeader({ ...header, toLocationId: v })}
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
