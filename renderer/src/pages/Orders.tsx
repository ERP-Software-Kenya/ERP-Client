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

export default function OrdersPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Order | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  // Wired up and ready, but the submit button below stays disabled. OrderEntity
  // has no organizationId column (tenancy flows through storeId -> store ->
  // org), so that's not the blocker here. The real blocker: CreateOrderRequest
  // requires a real customerId (@IsNotEmpty @IsUUID), and Customers create is
  // itself broken (CustomerEntity.organizationId is NOT NULL and never gets
  // set), so there is no way to obtain one to test against. Live-tested
  // 2026-07-26 with a fabricated customerId, which failed as expected on the
  // FK, not proof of an Order-specific bug. Re-test once Customers create
  // works, then remove the `disabled` prop.
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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get by UUID only — no directory. Line items have no API yet. Customers have no
            list either, so paste a Customer ID. <span className="text-amber-500 font-medium">Create
            is blocked</span> — depends on working Customers create / BE tenancy (see
            docs/core-apis-fixes.md #8).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Order</Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Create submit stays disabled until Customers create works and orders can be live-proven. Look
        up works when you already have an order UUID.
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
              <p>
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
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
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created order</div>
          <div>Order #: {lastCreated.orderNumber}</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Order"
        footer={
          <>
            <Button type="submit" form="order-form" disabled>
              Create (blocked — see notice above)
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — BE org/tenancy / customer dependency; do not enable until fixed.
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
              placeholder="Paste a Customer ID you already have"
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
