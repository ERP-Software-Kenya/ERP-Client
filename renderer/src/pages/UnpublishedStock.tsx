import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { RecentRecords } from '../components/RecentRecords';
import { ResourceSelect } from '../components/ResourceSelect';
import { SimpleTable } from '../components/SimpleTable';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Locations,
  Products,
  useUnpublishedStock,
  useUnpublishedStockMovements,
  useAddUnpublishedStock,
  usePublishUnpublishedStock,
  get,
} from '../api';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
import { formatEntityLabel } from '../lib/entityLabel';
import type { UnpublishedStock, UnpublishedStockMovement } from '../types';

interface AddForm {
  locationId: string;
  productId: string;
  quantity: string;
  unitCost: string;
  notes: string;
}

interface PublishForm {
  quantity: string;
  notes: string;
}

/** Local hint after add — API returns no id, so we remember what was staged. */
interface PendingAdd {
  locationId: string;
  productId: string;
  quantity: number;
  at: number;
}

const EMPTY_ADD: AddForm = { locationId: '', productId: '', quantity: '', unitCost: '', notes: '' };
const EMPTY_PUBLISH: PublishForm = { quantity: '', notes: '' };

export default function UnpublishedStockPage() {
  const recent = useRecentIds(RECENT_NS.unpublishedStock);

  const [activeId, setActiveId] = useState<string | undefined>();
  const [lookupId, setLookupId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [publishForm, setPublishForm] = useState<PublishForm>(EMPTY_PUBLISH);
  const [pending, setPending] = useState<PendingAdd | null>(null);

  const { data: record, isLoading, error, refetch } = useUnpublishedStock(activeId);
  const { data: movements, isLoading: movLoading } = useUnpublishedStockMovements(activeId);
  const addMutation = useAddUnpublishedStock();
  const publishMutation = usePublishUnpublishedStock();

  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();
  const productLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) {
      m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    }
    return m;
  }, [products]);
  const locationLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }));
    }
    return m;
  }, [locations]);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['unpublished-stock', e.id] as const,
      queryFn: () => get<UnpublishedStock>(`/api/v1/unpublished-stock/${e.id}`),
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
        productId: data?.productId,
        locationId: data?.locationId,
        quantityOnHand: data?.quantityOnHand,
        loading: q?.isLoading ?? false,
        failed: !!q?.isError,
      };
    });
  }, [recent.entries, recentQueries]);

  const sortedMovements = useMemo(() => {
    const rows = [...(movements ?? [])];
    rows.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [movements]);

  const step = !pending && !activeId ? 1 : pending && !activeId ? 2 : 3;

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter an unpublished stock record ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.locationId || !addForm.productId || !addForm.quantity) {
      toast.error('Location, product, and quantity are required');
      return;
    }
    const qty = Number(addForm.quantity);
    addMutation.mutate(
      {
        locationId: addForm.locationId,
        productId: addForm.productId,
        quantity: qty,
        unitCost: addForm.unitCost ? Number(addForm.unitCost) : undefined,
        notes: addForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setPending({
            locationId: addForm.locationId,
            productId: addForm.productId,
            quantity: qty,
            at: Date.now(),
          });
          setPublishForm({ quantity: String(qty), notes: '' });
          setAddOpen(false);
          setAddForm(EMPTY_ADD);
          setActiveId(undefined);
          toast.success('Staging stock added — load its record ID from Advanced to publish (API returns no ID)');
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to add staging stock'),
      },
    );
  };

  const submitPublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) {
      toast.error('Load a record first');
      return;
    }
    const qty = Number(publishForm.quantity || record.quantityOnHand);
    if (!qty || Number.isNaN(qty)) {
      toast.error('Quantity is required');
      return;
    }
    publishMutation.mutate(
      {
        unpublishedStockId: record.id,
        quantity: qty,
        notes: publishForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setPublishForm(EMPTY_PUBLISH);
          setPending(null);
          void refetch();
          toast.success('Published to inventory');
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to publish'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Unpublished stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stage → load record → publish. Core API add returns void and has no list; Recent is this
            browser only.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>1. Add staging stock</Button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { n: 1, label: 'Add staging' },
          { n: 2, label: 'Load record' },
          { n: 3, label: 'Publish' },
        ].map((s) => (
          <span
            key={s.n}
            className={`rounded-md border px-2.5 py-1 ${
              step === s.n
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : step > s.n
                  ? 'border-border text-muted-foreground'
                  : 'border-dashed border-border text-muted-foreground/70'
            }`}
          >
            {s.n}. {s.label}
          </span>
        ))}
      </div>

      {pending && !activeId && (
        <FormSection title="2. Load the staged record to continue">
          <p className="mb-3 text-sm text-muted-foreground">
            Just staged{' '}
            <span className="text-foreground font-medium">
              {pending.quantity} ×{' '}
              {productLabel.get(pending.productId) ?? formatEntityLabel({ id: pending.productId })}
            </span>{' '}
            at {locationLabel.get(pending.locationId) ?? formatEntityLabel({ id: pending.locationId })}. The API
            did not return an ID, so load the record from Advanced when one is available.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)}>
            Dismiss hint
          </Button>
        </FormSection>
      )}

      <RecentRecords
        title="Recent records"
        emptyHint="No recent records yet. Load a record from Advanced and it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'product',
            header: 'Product',
            render: (r) =>
              r.loading ? '…' : productLabel.get(r.productId ?? '') ?? formatEntityLabel({ id: r.productId }),
          },
          {
            key: 'location',
            header: 'Location',
            render: (r) =>
              r.loading ? '…' : locationLabel.get(r.locationId ?? '') ?? formatEntityLabel({ id: r.locationId }),
          },
          {
            key: 'qty',
            header: 'On hand',
            render: (r) => (r.loading ? '…' : r.failed ? '—' : r.quantityOnHand ?? '—'),
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    loadById(r.id);
                    if (r.quantityOnHand != null) {
                      setPublishForm((f) => ({
                        ...f,
                        quantity: f.quantity || String(r.quantityOnHand),
                      }));
                    }
                  }}
                >
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
        entityLabel="unpublished stock record"
        value={lookupId}
        onChange={setLookupId}
        onLoad={() => loadById(lookupId)}
        defaultOpen={!!pending}
      />

      {activeId && (
        <FormSection title="3. Record & publish">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !record ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Record not found.'}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">ID:</span> {record.id}
                </p>
                <p>
                  <span className="text-muted-foreground">On hand:</span> {record.quantityOnHand}
                </p>
                <p>
                  <span className="text-muted-foreground">Product:</span>{' '}
                  {productLabel.get(record.productId) ?? formatEntityLabel({ id: record.productId })}
                </p>
                <p>
                  <span className="text-muted-foreground">Location:</span>{' '}
                  {locationLabel.get(record.locationId) ?? formatEntityLabel({ id: record.locationId })}
                </p>
                <p>
                  <span className="text-muted-foreground">Avg cost:</span> {record.averageCost ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Bin:</span> {record.binLocation ?? '—'}
                </p>
              </div>

              <form
                onSubmit={submitPublish}
                className="space-y-3 rounded-lg border border-border p-4"
              >
                <p className="text-sm font-medium">Publish to live inventory</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Quantity" required>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={publishForm.quantity || String(record.quantityOnHand ?? '')}
                      onChange={(e) => setPublishForm({ ...publishForm, quantity: e.target.value })}
                    />
                  </Field>
                  <Field label="Notes">
                    <Input
                      value={publishForm.notes}
                      onChange={(e) => setPublishForm({ ...publishForm, notes: e.target.value })}
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={publishMutation.isPending}>
                  {publishMutation.isPending ? 'Publishing…' : 'Publish to inventory'}
                </Button>
              </form>

              <div>
                <h3 className="mb-2 text-sm font-medium">Movements (newest first)</h3>
                {movLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : sortedMovements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No movements.</p>
                ) : (
                  <SimpleTable
                    columns={[
                      {
                        key: 'type',
                        header: 'Type',
                        render: (m: UnpublishedStockMovement) => m.movementType,
                      },
                      { key: 'qty', header: 'Qty', render: (m) => m.quantity },
                      {
                        key: 'change',
                        header: 'Before → After',
                        render: (m) => `${m.quantityBefore} → ${m.quantityAfter}`,
                      },
                      { key: 'notes', header: 'Notes', render: (m) => m.notes ?? '—' },
                      {
                        key: 'when',
                        header: 'When',
                        render: (m) => (m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'),
                      },
                    ]}
                    rows={sortedMovements}
                    rowKey={(m) => m.id}
                  />
                )}
              </div>
            </div>
          )}
        </FormSection>
      )}

      <FormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="1. Add unpublished stock"
        footer={
          <>
            <Button type="submit" form="unpub-add-form" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding…' : 'Add staging'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="unpub-add-form" onSubmit={submitAdd} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            After save, load the staged record from Advanced — Core API returns an empty body.
          </p>
          <Field label="Location" required>
            <ResourceSelect
              resource={Locations}
              getLabel={(l) => l.name}
              value={addForm.locationId}
              onValueChange={(locationId) => setAddForm({ ...addForm, locationId })}
            />
          </Field>
          <Field label="Product" required>
            <ResourceSelect
              resource={Products}
              getLabel={(p) => formatEntityLabel({ name: p.name, sku: p.sku, id: p.id })}
              value={addForm.productId}
              onValueChange={(productId) => setAddForm({ ...addForm, productId })}
            />
          </Field>
          <Field label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="any"
              value={addForm.quantity}
              onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
            />
          </Field>
          <Field label="Unit cost">
            <Input
              type="number"
              min="0"
              step="any"
              value={addForm.unitCost}
              onChange={(e) => setAddForm({ ...addForm, unitCost: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Input value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
