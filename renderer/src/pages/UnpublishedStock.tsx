import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Locations,
  Products,
  useUnpublishedStock,
  useUnpublishedStockMovements,
  useAddUnpublishedStock,
  usePublishUnpublishedStock,
} from '../api';

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

const EMPTY_ADD: AddForm = { locationId: '', productId: '', quantity: '', unitCost: '', notes: '' };
const EMPTY_PUBLISH: PublishForm = { quantity: '', notes: '' };

export default function UnpublishedStockPage() {
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [publishForm, setPublishForm] = useState<PublishForm>(EMPTY_PUBLISH);

  const { data: record, isLoading, error, refetch } = useUnpublishedStock(activeId);
  const { data: movements, isLoading: movLoading } = useUnpublishedStockMovements(activeId);
  const addMutation = useAddUnpublishedStock();
  const publishMutation = usePublishUnpublishedStock();

  const loadRecord = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter an unpublished stock UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.locationId || !addForm.productId || !addForm.quantity) {
      toast.error('Store, product, and quantity are required');
      return;
    }
    addMutation.mutate(
      {
        locationId: addForm.locationId,
        productId: addForm.productId,
        quantity: Number(addForm.quantity),
        unitCost: addForm.unitCost ? Number(addForm.unitCost) : undefined,
        notes: addForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setAddForm(EMPTY_ADD);
          toast.success('Staging stock added — look up the record by UUID (no list API yet)');
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to add staging stock'),
      },
    );
  };

  const submitPublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record || !publishForm.quantity) {
      toast.error('Quantity is required');
      return;
    }
    publishMutation.mutate(
      {
        unpublishedStockId: record.id,
        quantity: Number(publishForm.quantity),
        notes: publishForm.notes || undefined,
      },
      {
        onSuccess: () => {
          setPublishOpen(false);
          setPublishForm(EMPTY_PUBLISH);
          void refetch();
          toast.success('Published to inventory');
        },
        onError: (err: Error) => toast.error(err.message || 'Failed to publish'),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Unpublished stock</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Staging area before stock hits live inventory. Create and publish by UUID only.
        </p>
      </div>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
        No list endpoint — look up a staging record by UUID after adding (or paste a known ID).
      </div>

      <FormSection title="Look up record">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Unpublished stock UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadRecord}>
            Load
          </Button>
          <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
            Add staging stock
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Record">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !record ? (
            <p className="text-sm text-destructive">Record not found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">On hand:</span> {record.quantityOnHand}
                </p>
                <p>
                  <span className="text-muted-foreground">Product:</span> {record.productId.slice(0, 8)}…
                </p>
                <p>
                  <span className="text-muted-foreground">Store:</span> {record.locationId.slice(0, 8)}…
                </p>
                <p>
                  <span className="text-muted-foreground">Avg cost:</span>{' '}
                  {record.averageCost != null ? record.averageCost : '—'}
                </p>
              </div>
              <Button type="button" onClick={() => setPublishOpen(true)}>
                Publish to inventory
              </Button>
            </div>
          )}
        </FormSection>
      )}

      {activeId && (
        <FormSection title="Staging movements">
          {movLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (movements?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No movements.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Before → After</th>
                    <th className="py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {movements!.map((m) => (
                    <tr key={m.id} className="border-b border-border/60">
                      <td className="py-2 pr-4">{m.movementType}</td>
                      <td className="py-2 pr-4">{m.quantity}</td>
                      <td className="py-2 pr-4">
                        {m.quantityBefore} → {m.quantityAfter}
                      </td>
                      <td className="py-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : '—'}</td>
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
            <Button type="submit" form="unpub-add-form" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding…' : 'Add'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="unpub-add-form" onSubmit={submitAdd} className="space-y-4">
          <Field label="Store" required>
            <ResourceSelect
              resource={Locations}
              getLabel={(l) => (l.type ? `${l.name} (${l.type})` : l.name)}
              value={addForm.locationId}
              onValueChange={(v) => setAddForm({ ...addForm, locationId: v })}
            />
          </Field>
          <Field label="Product" required>
            <ResourceSelect
              resource={Products}
              getLabel={(p) => p.name || p.id.slice(0, 8)}
              value={addForm.productId}
              onValueChange={(v) => setAddForm({ ...addForm, productId: v })}
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

      <FormDrawer
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish to live inventory"
        footer={
          <>
            <Button type="submit" form="unpub-publish-form" disabled={publishMutation.isPending}>
              {publishMutation.isPending ? 'Publishing…' : 'Publish'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="unpub-publish-form" onSubmit={submitPublish} className="space-y-4">
          <Field label="Quantity" required hint={record ? `Staging on hand: ${record.quantityOnHand}` : undefined}>
            <Input
              type="number"
              min="0"
              step="any"
              value={publishForm.quantity}
              onChange={(e) => setPublishForm({ ...publishForm, quantity: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Input value={publishForm.notes} onChange={(e) => setPublishForm({ ...publishForm, notes: e.target.value })} />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
