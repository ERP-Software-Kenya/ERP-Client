import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Locations as LocationsApi,
  Products as ProductsApi,
  getUnpublishedStock,
  listUnpublishedStockMovements,
  addUnpublishedStock,
  publishUnpublishedStock,
} from '../api';
import type { UnpublishedStockMovement } from '../types';

export default function UnpublishedStockPage() {
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    locationId: '',
    productId: '',
    quantity: '',
    unitCost: '',
    notes: '',
  });
  const [publishForm, setPublishForm] = useState({
    unpublishedStockId: '',
    quantity: '',
    notes: '',
  });

  const {
    data: record,
    isFetching: recordLoading,
    error: recordError,
    refetch: refetchRecord,
  } = useQuery({
    queryKey: ['unpublished-stock', activeId],
    queryFn: () => getUnpublishedStock(activeId),
    enabled: !!activeId,
    retry: false,
  });

  const {
    data: movements = [],
    isFetching: movementsLoading,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: ['unpublished-stock', activeId, 'movements'],
    queryFn: () => listUnpublishedStockMovements(activeId),
    enabled: !!activeId,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addUnpublishedStock({
        locationId: addForm.locationId,
        productId: addForm.productId,
        quantity: Number(addForm.quantity),
        unitCost: addForm.unitCost ? Number(addForm.unitCost) : undefined,
        notes: addForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Unpublished stock added');
      setAddOpen(false);
      setAddForm({ locationId: '', productId: '', quantity: '', unitCost: '', notes: '' });
    },
    onError: (err: Error) => toast.error(err.message || 'Add failed'),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      publishUnpublishedStock({
        unpublishedStockId: publishForm.unpublishedStockId,
        quantity: Number(publishForm.quantity),
        notes: publishForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Stock published to inventory');
      setPublishOpen(false);
      if (activeId && activeId === publishForm.unpublishedStockId) {
        refetchRecord();
        refetchMovements();
      }
      setPublishForm({ unpublishedStockId: '', quantity: '', notes: '' });
    },
    onError: (err: Error) => toast.error(err.message || 'Publish failed'),
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const id = lookupId.trim();
    if (!id) {
      toast.error('Enter an unpublished stock UUID');
      return;
    }
    setActiveId(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Unpublished Stock</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Holding pool before publishing to live inventory. No list API — look up by UUID, then
            add to the pool or publish quantities live.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            Add to pool
          </Button>
          <Button
            onClick={() => {
              setPublishForm((f) => ({
                ...f,
                unpublishedStockId: activeId || f.unpublishedStockId,
              }));
              setPublishOpen(true);
            }}
          >
            Publish
          </Button>
        </div>
      </div>

      <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[280px] flex-1">
          <Field label="Unpublished stock ID">
            <Input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Paste UUID…"
            />
          </Field>
        </div>
        <Button type="submit" disabled={recordLoading}>
          {recordLoading ? 'Loading…' : 'Look up'}
        </Button>
      </form>

      {recordError && activeId && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {(recordError as Error).message || 'Lookup failed'}
        </div>
      )}

      {record && (
        <FormSection title="Record">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs break-all">{record.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Qty on hand</dt>
              <dd>{record.quantityOnHand}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-mono text-xs break-all">{record.locationId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Product</dt>
              <dd className="font-mono text-xs break-all">{record.productId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg cost</dt>
              <dd>{record.averageCost ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bin</dt>
              <dd>{record.binLocation ?? '—'}</dd>
            </div>
          </dl>
        </FormSection>
      )}

      {activeId && (
        <FormSection title="Movements">
          {movementsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements for this record.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Before</th>
                    <th className="px-3 py-2 font-medium">After</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((row: UnpublishedStockMovement) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-3 py-2">{row.movementType}</td>
                      <td className="px-3 py-2">{row.quantity}</td>
                      <td className="px-3 py-2">{row.quantityBefore}</td>
                      <td className="px-3 py-2">{row.quantityAfter}</td>
                      <td className="px-3 py-2">{row.notes || '—'}</td>
                      <td className="px-3 py-2">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FormSection>
      )}

      <FormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add unpublished stock"
        footer={
          <>
            <Button
              type="submit"
              form="unpublished-add-form"
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? 'Saving…' : 'Add'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form
          id="unpublished-add-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addForm.locationId || !addForm.productId || !addForm.quantity) {
              toast.error('Location, product, and quantity are required');
              return;
            }
            addMutation.mutate();
          }}
        >
          <Field label="Location" required>
            <ResourceSelect
              queryKey="locations"
              fetchList={() => LocationsApi.list()}
              getLabel={(l) => l.name}
              value={addForm.locationId}
              onValueChange={(locationId) => setAddForm({ ...addForm, locationId })}
            />
          </Field>
          <Field label="Product" required>
            <ResourceSelect
              queryKey="products"
              fetchList={() => ProductsApi.list()}
              getLabel={(p) => p.name || p.id}
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
              required
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
            <Input
              value={addForm.notes}
              onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>

      <FormDrawer
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish unpublished stock"
        footer={
          <>
            <Button
              type="submit"
              form="unpublished-publish-form"
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? 'Publishing…' : 'Publish'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form
          id="unpublished-publish-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!publishForm.unpublishedStockId || !publishForm.quantity) {
              toast.error('Unpublished stock ID and quantity are required');
              return;
            }
            publishMutation.mutate();
          }}
        >
          <Field label="Unpublished stock ID" required>
            <Input
              value={publishForm.unpublishedStockId}
              onChange={(e) =>
                setPublishForm({ ...publishForm, unpublishedStockId: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Quantity" required>
            <Input
              type="number"
              min="0"
              step="any"
              value={publishForm.quantity}
              onChange={(e) => setPublishForm({ ...publishForm, quantity: e.target.value })}
              required
            />
          </Field>
          <Field label="Notes">
            <Input
              value={publishForm.notes}
              onChange={(e) => setPublishForm({ ...publishForm, notes: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
