import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Orders as OrdersApi, Stores as StoresApi } from '../api';
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

export default function Orders() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Order | null>(null);

  const closeDrawer = () => setDrawerOpen(false);

  // Wired up and ready, but the submit button below stays disabled: entity's
  // NOT-NULL organizationId is never set by the command, every create 500s.
  // Live-tested 2026-07-26 (with a real storeId; customerId was necessarily
  // fabricated since Customers create is itself broken). See
  // docs/core-apis-fixes.md #8. Remove the `disabled` prop once that's fixed.
  const createMutation = useMutation({
    mutationFn: (body: Partial<Order>) => OrdersApi.create(body),
    onSuccess: (created) => {
      toast.success(`Order ${created.orderNumber} created`);
      setLastCreated(created);
      closeDrawer();
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create order'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      storeId: form.storeId || undefined,
      customerId: form.customerId || undefined,
      status: form.status || undefined,
      subtotal: form.subtotal ? Number(form.subtotal) : undefined,
      taxAmount: form.taxAmount ? Number(form.taxAmount) : undefined,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      paymentStatus: form.paymentStatus || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists, so there's no directory here. Line items have no API yet either
            (they exist in the database but aren't exposed) — an order can only record a total amount,
            not what was actually sold. Customers have no list endpoint, so paste a Customer ID you
            already have. <span className="text-amber-500 font-medium">Currently blocked</span> —
            live-tested 2026-07-26, creation fails on the backend every time (see docs/core-apis-fixes.md #8).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Order</Button>
      </div>

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
            Submitting is disabled — this endpoint currently fails server-side for every request.
          </div>
          <Field label="Store">
            <ResourceSelect
              queryKey="stores"
              fetchList={() => StoresApi.list()}
              getLabel={(s) => s.name}
              value={form.storeId}
              onValueChange={(v) => setForm({ ...form, storeId: v })}
              placeholder="Select store…"
            />
          </Field>
          <Field label="Customer ID">
            <Input
              placeholder="Paste a Customer ID you already have"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
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
