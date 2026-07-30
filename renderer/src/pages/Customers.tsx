import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Customers } from '../api';
import type { Customer } from '../types';

interface FormState {
  name: string;
  email: string;
  phone: string;
  gstin: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', gstin: '' };

export default function CustomersPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Customer | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  // Wired up and ready, but the submit button below stays disabled: entity's
  // NOT-NULL organizationId is never set by the command, every create 500s.
  // Live-tested 2026-07-26 directly against the deployed API with no FK
  // dependencies at all — the cleanest possible confirmation in this app, and
  // strong evidence for the missing-auth-guard root cause (see
  // docs/core-apis-fixes.md #8, #10). Remove the `disabled` prop once fixed.
  const createMutation = Customers.useCreate();
  const { data: lookedUp, isLoading, error } = Customers.useGet(activeId);

  const loadCustomer = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter a customer UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        gstin: form.gstin || undefined,
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
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get by UUID only — no directory/list endpoint. Once created, paste the ID into
            an Order or Invoice. <span className="text-amber-500 font-medium">Create is blocked</span>{' '}
            — live-tested 2026-07-26, BE fails every create (org/tenancy; see docs/core-apis-fixes.md #8).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Customer</Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Create submit stays disabled until the backend sets organizationId. Look up works when you
        already have a customer UUID.
      </div>

      <FormSection title="Look up customer">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Customer UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadCustomer}>
            Load
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Customer">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !lookedUp ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Customer not found.'}
            </p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
              </p>
              <p>
                <span className="text-muted-foreground">Name:</span> {lookedUp.name ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {lookedUp.email ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {lookedUp.phone ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">GSTIN:</span> {lookedUp.gstin ?? '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created customer</div>
          <div>ID: {lastCreated.id}</div>
          <div>Name: {lastCreated.name}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Customer"
        footer={
          <>
            <Button type="submit" form="customer-form" disabled>
              Create (blocked — see notice above)
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — BE org/tenancy issues; do not enable until backend is fixed.
          </div>
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="GSTIN">
            <Input
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
