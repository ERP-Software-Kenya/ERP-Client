import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<PurchaseItem | null>(null);

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
      setDialogOpen(false);
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
        <Button onClick={() => setDialogOpen(true)}>New Purchase Item</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created purchase item</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Purchase Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — this endpoint currently fails server-side for every request.
            </div>
            <div className="space-y-2">
              <Label>Purchase Order</Label>
              <ResourceSelect
                queryKey="purchase-orders"
                fetchList={() => PurchaseOrdersApi.list()}
                getLabel={(po) => po.name || po.id}
                value={form.purchaseOrderId}
                onValueChange={(v) => setForm({ ...form, purchaseOrderId: v })}
                placeholder="Select purchase order…"
              />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <ResourceSelect
                queryKey="products"
                fetchList={() => ProductsApi.list()}
                getLabel={(p) => p.name}
                value={form.productId}
                onValueChange={(v) => setForm({ ...form, productId: v })}
                placeholder="Select product…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-quantity">Quantity</Label>
              <Input
                id="pi-quantity"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-unit-price">Unit Price</Label>
              <Input
                id="pi-unit-price"
                type="number"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled>
                Create (blocked — see notice above)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
