import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Invoices } from '../api';
import type { Invoice } from '../types';

interface FormState {
  orderId: string;
  totalAmount: string;
  status: string;
}

const EMPTY_FORM: FormState = { orderId: '', totalAmount: '', status: '' };

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function InvoicesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Invoice | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const createMutation = Invoices.useCreate();
  const { data: lookedUp, isLoading, error } = Invoices.useGet(activeId);

  const closeDrawer = () => setDrawerOpen(false);

  const loadInvoice = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter an invoice UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        orderId: form.orderId || undefined,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
        status: form.status || undefined,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setActiveId(created.id);
          setLookupId(created.id);
          setDrawerOpen(false);
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get by UUID only — no directory. Paste an Order ID.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Invoice</Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Create is enabled against the live API. Needs a real <code className="text-xs">orderId</code> —
        failures surface in the error toast.
      </div>

      <FormSection title="Look up invoice">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Invoice UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadInvoice}>
            Load
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Invoice">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !lookedUp ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Invoice not found.'}
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
                <span className="text-muted-foreground">Invoice #:</span>{' '}
                {lookedUp.invoiceNumber ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Order:</span> {lookedUp.orderId ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{' '}
                {lookedUp.totalAmount != null ? lookedUp.totalAmount : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {lookedUp.status ?? '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
          <div className="font-medium">Last created invoice</div>
          <div>Invoice #: {lastCreated.invoiceNumber}</div>
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
        title="New Invoice"
        footer={
          <>
            <Button type="submit" form="invoice-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Live Swagger requires <code className="text-[10px]">orderId</code>.
          </div>
          <Field label="Order ID" required>
            <Input
              placeholder="Paste an Order UUID"
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
