import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PurchaseOrders, PurchaseItems, Products } from '../api';

interface ItemFormState {
  productId: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_ITEM_FORM: ItemFormState = { productId: '', quantity: '', unitPrice: '' };

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);

  const closeItemDrawer = () => setItemDrawerOpen(false);

  const { data: po, isLoading, error } = PurchaseOrders.useGet(id);

  // Wired up and ready, but the submit button below stays disabled: POST
  // /purchase-items 500s on every call — the DTO sends quantity/unitPrice but the
  // entity's real NOT-NULL columns are quantityOrdered/unitCost. See
  // docs/core-apis-fixes.md #0b. Remove the `disabled` prop once that's fixed.
  const createItemMutation = PurchaseItems.useCreate();

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    createItemMutation.mutate(
      {
        purchaseOrderId: id,
        productId: itemForm.productId || undefined,
        quantity: itemForm.quantity ? Number(itemForm.quantity) : undefined,
        unitPrice: itemForm.unitPrice ? Number(itemForm.unitPrice) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Line item added');
          closeItemDrawer();
          setItemForm(EMPTY_ITEM_FORM);
          queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
        },
      },
    );
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error || !po) return <div className="p-6 text-red-500">Failed to load purchase order: {String(error)}</div>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/purchase-orders')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Purchase Orders
      </button>

      <div>
        <h1 className="text-2xl font-semibold">{po.name || '(unnamed purchase order)'}</h1>
        <p className="text-muted-foreground text-sm mt-1">ID: {po.id}</p>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Supplier, store, status, total amount, and order date aren't exposed by the API today — only
        "Name" round-trips (see docs/core-apis-fixes.md #0).
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Line Items</h2>
          <Button size="sm" onClick={() => setItemDrawerOpen(true)}>
            Add Item
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No list endpoint exists for purchase items, and the response for this purchase order doesn't
          embed them either — items created here can't be displayed back. See
          docs/superpowers/specs/2026-07-23-erp-implementation-02-purchase-module.md §3.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Linked Bills</h2>
          <Button size="sm" disabled title="Bill creation is currently blocked, see notice">
            Create Bill from this PO
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Bills have no field linking them to a Purchase Order in the current backend — there's nothing
          to filter on. See docs/core-apis-fixes.md #0c.
        </p>
      </div>

      <FormDrawer
        open={itemDrawerOpen}
        onClose={closeItemDrawer}
        title="Add Line Item"
        footer={
          <>
            <Button type="submit" form="purchase-order-item-form" disabled>
              Add (blocked — see notice above)
            </Button>
            <Button type="button" variant="outline" onClick={closeItemDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="purchase-order-item-form" onSubmit={handleAddItem} className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — this endpoint currently fails server-side for every request.
          </div>
          <Field label="Product">
            <ResourceSelect
              resource={Products}
              getLabel={(p) => p.name || p.sku || p.id}
              value={itemForm.productId}
              onValueChange={(v) => setItemForm({ ...itemForm, productId: v })}
              placeholder="Select product…"
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min="0"
              value={itemForm.quantity}
              onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
            />
          </Field>
          <Field label="Unit Price">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={itemForm.unitPrice}
              onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
