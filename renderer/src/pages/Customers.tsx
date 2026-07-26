import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Customers as CustomersApi } from '../api';
import type { Customer } from '../types';

interface FormState {
  name: string;
  email: string;
  phone: string;
  gstin: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', gstin: '' };

export default function Customers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Customer | null>(null);

  // Wired up and ready, but the submit button below stays disabled: entity's
  // NOT-NULL organizationId is never set by the command, every create 500s.
  // Live-tested 2026-07-26 directly against the deployed API with no FK
  // dependencies at all — the cleanest possible confirmation in this app, and
  // strong evidence for the missing-auth-guard root cause (see
  // docs/core-apis-fixes.md #8, #10). Remove the `disabled` prop once fixed.
  const createMutation = useMutation({
    mutationFn: (body: Partial<Customer>) => CustomersApi.create(body),
    onSuccess: (created) => {
      toast.success(`Customer "${created.name}" created`);
      setLastCreated(created);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create customer'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      gstin: form.gstin || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for customers — there's no directory here, only a create form. Once
            created, a customer's ID must be referenced from an Order/Invoice you're creating.
            <span className="text-amber-500 font-medium"> Currently blocked</span> — live-tested
            2026-07-26, creation fails on the backend every time (see docs/core-apis-fixes.md #8).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Customer</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created customer</div>
          <div>ID: {lastCreated.id}</div>
          <div>Name: {lastCreated.name}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — this endpoint currently fails server-side for every request.
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-name">Name</Label>
              <Input
                id="cust-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Phone</Label>
              <Input
                id="cust-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-gstin">GSTIN</Label>
              <Input
                id="cust-gstin"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
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
