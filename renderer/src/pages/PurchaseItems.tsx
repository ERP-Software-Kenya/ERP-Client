import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { PurchaseItems, Products } from '../api';

interface FormState {
  purchaseOrderId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_FORM: FormState = { purchaseOrderId: '', productId: '', quantity: '', unitPrice: '' };

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function PurchaseItemsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = useState<FormState>(EMPTY_FORM);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);
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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Items</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Get-by-UUID only. Create blocked by Core API column mismatch (#0b).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} variant="outline" disabled>
          New Purchase Item (blocked)
        </Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Verified: request/command use <code className="text-xs">quantity</code> /{' '}
        <code className="text-xs">unitPrice</code>; entity requires{' '}
        <code className="text-xs">quantityOrdered</code> / <code className="text-xs">unitCost</code>. Client
        cannot rename through the wire.
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
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
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

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Purchase Item"
        footer={
          <>
            <Button type="submit" form="purchase-item-form" disabled>
              Create (blocked — Core API #0b)
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="purchase-item-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Purchase Order ID">
            <Input value={form.purchaseOrderId} disabled onChange={() => undefined} />
          </Field>
          <Field label="Product">
            <ResourceSelect
              resource={Products}
              getLabel={(p) => p.name || p.sku || p.id}
              value={form.productId}
              onValueChange={() => undefined}
              placeholder="Select product…"
            />
          </Field>
          <Field label="Quantity">
            <Input type="number" value={form.quantity} disabled onChange={() => undefined} />
          </Field>
          <Field label="Unit Price">
            <Input type="number" value={form.unitPrice} disabled onChange={() => undefined} />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
