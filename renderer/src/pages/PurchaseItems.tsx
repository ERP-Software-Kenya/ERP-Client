import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { PurchaseItems, Products } from '../api';
import type { PurchaseItem } from '../types';

interface FormState {
  purchaseOrderId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_FORM: FormState = { purchaseOrderId: '', productId: '', quantity: '', unitPrice: '' };

export default function PurchaseItemsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<PurchaseItem | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  // Verified 2026-07-28 directly against core-apis purchase-item.entity.ts: the
  // entity's NOT-NULL columns are quantityOrdered/unitCost with no default, but
  // this create endpoint only accepts quantity/unitPrice. Every create fails with
  // a NOT NULL constraint violation on the backend. Remove `disabled` once the
  // backend request DTO is fixed to match its own entity.
  const createMutation = PurchaseItems.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = PurchaseItems.useGet(activeId);

  const loadItem = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter a purchase item UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        purchaseOrderId: form.purchaseOrderId || undefined,
        productId: form.productId || undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
      },
      {
        onSuccess: (created) => {
          toast.success('Purchase item created');
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          closeDrawer();
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Items</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for purchase items — there's no directory here. Create (when unblocked) or look
            up by UUID. Purchase orders also have no reliable list today, so paste a PO ID.
            <span className="text-amber-500 font-medium"> Currently blocked</span> — verified 2026-07-28
            against the backend entity, creation fails on the server every time (NOT NULL column
            mismatch: quantityOrdered/unitCost vs quantity/unitPrice).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Purchase Item</Button>
      </div>

      <FormSection title="Look up purchase item">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Purchase item UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadItem}>
            Load
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Purchase item details">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">
              Purchase item not found
              {lookupError instanceof Error && lookupError.message ? `: ${lookupError.message}` : '.'}
            </p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
              </p>
              <p>
                <span className="text-muted-foreground">Purchase order:</span>{' '}
                {lookedUp.purchaseOrderId ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Product:</span> {lookedUp.productId ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Quantity:</span>{' '}
                {lookedUp.quantity != null ? lookedUp.quantity : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Unit price:</span>{' '}
                {lookedUp.unitPrice != null ? lookedUp.unitPrice : '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created purchase item</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Purchase Item"
        footer={
          <>
            <Button type="submit" form="purchase-item-form" disabled>
              Create (blocked — see notice above)
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="purchase-item-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — this endpoint currently fails server-side for every request.
          </div>
          <Field label="Purchase Order ID" required>
            <Input
              placeholder="Paste a Purchase Order UUID"
              value={form.purchaseOrderId}
              onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })}
              required
            />
          </Field>
          <Field label="Product">
            <ResourceSelect
              resource={Products}
              getLabel={(p) => p.name || p.sku || p.id}
              value={form.productId}
              onValueChange={(v) => setForm({ ...form, productId: v })}
              placeholder="Select product…"
            />
          </Field>
          <Field label="Quantity" required>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </Field>
          <Field label="Unit Price" required>
            <Input
              type="number"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              required
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
