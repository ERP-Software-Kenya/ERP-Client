import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Invoices as InvoicesApi } from '../api';
import type { Invoice } from '../types';

interface FormState {
  orderId: string;
  totalAmount: string;
  status: string;
}

const EMPTY_FORM: FormState = { orderId: '', totalAmount: '', status: '' };

export default function Invoices() {
  const [dialogOpen, setDialogOpen] = useState(false);
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
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  });

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
        <Button onClick={() => setDialogOpen(true)}>New Invoice</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created invoice</div>
          <div>Invoice #: {lastCreated.invoiceNumber}</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — not yet confirmed working against the live backend.
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-order-id">Order ID</Label>
              <Input
                id="inv-order-id"
                placeholder="Paste an Order ID you already have"
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-total">Total Amount</Label>
              <Input
                id="inv-total"
                type="number"
                step="0.01"
                min="0"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-status">Status</Label>
              <Input
                id="inv-status"
                placeholder="e.g. UNPAID"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
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
