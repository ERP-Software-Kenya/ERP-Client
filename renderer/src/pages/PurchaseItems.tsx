import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { PurchaseItems as PurchaseItemsApi, PurchaseOrders as PurchaseOrdersApi, Products as ProductsApi } from '../api';
import type { PurchaseItem } from '../types';

interface FormState {
  purchaseOrderId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_FORM: FormState = { purchaseOrderId: '', productId: '', quantity: '', unitPrice: '' };

export default function PurchaseItems() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<PurchaseItem | null>(null);

  const closeDrawer = () => setDrawerOpen(false);

  // Verified 2026-07-28 directly against core-apis purchase-item.entity.ts: the
  // entity's NOT-NULL columns are quantityOrdered/unitCost with no default, but
  // this create endpoint only accepts quantity/unitPrice. Every create fails with
  // a NOT NULL constraint violation on the backend. Remove `disabled` once the
  // backend request DTO is fixed to match its own entity.
  const createMutation = useMutation({
    mutationFn: (body: Partial<PurchaseItem>) => PurchaseItemsApi.create(body),
    onSuccess: (created) => {
      toast.success('Purchase item created');
      setLastCreated(created);
      closeDrawer();
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create purchase item'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      purchaseOrderId: form.purchaseOrderId || undefined,
      productId: form.productId || undefined,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Items</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for purchase items — there's no directory here, only a create form.
            <span className="text-amber-500 font-medium"> Currently blocked</span> — verified 2026-07-28
            against the backend entity, creation fails on the server every time (NOT NULL column
            mismatch: quantityOrdered/unitCost vs quantity/unitPrice).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Purchase Item</Button>
      </div>

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
          <Field label="Purchase Order">
            <ResourceSelect
              queryKey="purchase-orders"
              fetchList={() => PurchaseOrdersApi.list()}
              getLabel={(po) => po.name || po.id}
              value={form.purchaseOrderId}
              onValueChange={(v) => setForm({ ...form, purchaseOrderId: v })}
              placeholder="Select purchase order…"
            />
          </Field>
          <Field label="Product">
            <ResourceSelect
              queryKey="products"
              fetchList={() => ProductsApi.list()}
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
