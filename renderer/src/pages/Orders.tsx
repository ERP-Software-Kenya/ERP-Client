import { useState } from 'react';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Orders, Stores } from '../api';
import type { Order } from '../types';

interface FormState {
  storeId: string;
  customerId: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paymentStatus: string;
}

const EMPTY_FORM: FormState = {
  storeId: '',
  customerId: '',
  status: '',
  subtotal: '',
  taxAmount: '',
  totalAmount: '',
  paymentStatus: '',
};

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function OrdersPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Order | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = Orders.useCreate();
  const { data: lookedUp, isLoading, error } = Orders.useGet(activeId);

  const loadOrder = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter an order UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        storeId: form.storeId || undefined,
        customerId: form.customerId || undefined,
        status: form.status || undefined,
        subtotal: form.subtotal ? Number(form.subtotal) : undefined,
        taxAmount: form.taxAmount ? Number(form.taxAmount) : undefined,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        paymentStatus: form.paymentStatus || undefined,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setActiveId(created.id);
          setLookupId(created.id);
          closeDrawer();
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get by UUID only — no directory. Paste a Customer ID (customers have no list
            either).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Sales Order</Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Create is enabled and can succeed if you paste an existing customer UUID (Core API order create
        itself is fine). Customer <em>create</em> is broken (#8) and there is no customers list — use a
        known DB id. Live errors show in toast.
      </div>

      <FormSection title="Look up order">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Order UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadOrder}>
            Load
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Order">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !lookedUp ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Order not found.'}
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
                <span className="text-muted-foreground">Order #:</span> {lookedUp.orderNumber ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Store:</span> {lookedUp.storeId ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Customer:</span> {lookedUp.customerId ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {lookedUp.status ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{' '}
                {lookedUp.totalAmount != null ? lookedUp.totalAmount : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Payment:</span> {lookedUp.paymentStatus ?? '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
          <div className="font-medium">Last created order</div>
          <div>Order #: {lastCreated.orderNumber}</div>
          <div className="flex flex-wrap items-center gap-2">
            ID: {lastCreated.id}
            <Button type="button" variant="outline" size="sm" onClick={() => copyId(lastCreated.id)}>
              Copy
            </Button>
          </div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Sales Order"
        footer={
          <>
            <Button type="submit" form="order-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Live Swagger requires <code className="text-[10px]">storeId</code> +{' '}
            <code className="text-[10px]">customerId</code>.
          </div>
          <Field label="Store" required>
            <ResourceSelect
              resource={Stores}
              getLabel={(s) => s.name}
              value={form.storeId}
              onValueChange={(v) => setForm({ ...form, storeId: v })}
              placeholder="Select store…"
            />
          </Field>
          <Field label="Customer ID" required>
            <Input
              placeholder="Paste a Customer UUID"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              required
            />
          </Field>
          <Field label="Status">
            <Input
              placeholder="e.g. PENDING"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
          <Field label="Subtotal">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.subtotal}
              onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
            />
          </Field>
          <Field label="Tax Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.taxAmount}
              onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
            />
          </Field>
          <Field label="Total Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
            />
          </Field>
          <Field label="Payment Status">
            <Input
              placeholder="e.g. UNPAID"
              value={form.paymentStatus}
              onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
