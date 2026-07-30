import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Invoices as InvoicesApi } from '../api';
import type { Invoice } from '../types';

interface FormState {
  orderId: string;
  totalAmount: string;
  status: string;
}

const EMPTY_FORM: FormState = { orderId: '', totalAmount: '', status: '' };

export default function Invoices() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Invoice | null>(null);

  // Wired up and ready, but the submit button below stays disabled. Unlike most
  // resources in this app, this DTO looks genuinely clean (no organizationId
  // needed, invoiceNumber auto-generated server-side) — live-tested 2026-07-26
  // and it still 500s, though the test used a fabricated orderId since Orders
  // create is itself broken (see docs/core-apis-fixes.md #8), so this can't yet
  // be pinned to an Invoice-specific bug vs. a simple FK violation. Re-test once
  // Orders can create a real order. Remove `disabled` once confirmed working.
  const createMutation = useMutation({
    mutationFn: (body: Partial<Invoice>) => InvoicesApi.create(body),
    onSuccess: (created) => {
      toast.success(`Invoice ${created.invoiceNumber} created`);
      setLastCreated(created);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  });

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      orderId: form.orderId || undefined,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      status: form.status || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists, so there's no directory here. Orders have no list endpoint either,
            so paste an Order ID you already have.
            <span className="text-amber-500 font-medium"> Currently blocked</span> — live-tested
            2026-07-26 and it 500s (see docs/core-apis-fixes.md #8), though the test was necessarily
            confounded by a fabricated Order ID since Orders can't create a real one yet.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Invoice</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created invoice</div>
          <div>Invoice #: {lastCreated.invoiceNumber}</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Invoice"
        footer={
          <>
            <Button type="submit" form="invoice-form" disabled>
              Create (blocked — see notice above)
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — not yet confirmed working against the live backend.
          </div>
          <Field label="Order ID" required>
            <Input
              placeholder="Paste an Order ID you already have"
              value={form.orderId}
              onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              required
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
          <Field label="Status">
            <Input
              placeholder="e.g. UNPAID"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
