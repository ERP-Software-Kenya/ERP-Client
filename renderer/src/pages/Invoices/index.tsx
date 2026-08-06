import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../../components/AdvancedIdLookup';
import { FormDrawer, Field, FormSection } from '../../components/FormDrawer';
import { RecentIdPicker } from '../../components/RecentIdPicker';
import { RecentRecords } from '../../components/RecentRecords';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { get, Invoices } from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../../lib/recentIds';
import type { Invoice } from '../../types';

interface FormState {
  orderId: string;
  totalAmount: string;
  status: string;
}

const EMPTY_FORM: FormState = { orderId: '', totalAmount: '', status: '' };

function invoiceLabel(invoice: Invoice) {
  return invoice.invoiceNumber ?? invoice.status ?? (invoice.totalAmount != null ? `${invoice.totalAmount}` : undefined);
}

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function InvoicesPage() {
  const recent = useRecentIds(RECENT_NS.invoices);
  const recentOrders = useRecentIds(RECENT_NS.orders);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Invoice | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const createMutation = Invoices.useCreate();
  const { data: lookedUp, isLoading, error } = Invoices.useGet(activeId);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['invoices', e.id] as const,
      queryFn: () => get<Invoice>(`/api/v1/invoices/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(
    () =>
      recent.entries.map((e, i) => {
        const query = i < HYDRATE_LIMIT ? recentQueries[i] : undefined;
        const invoice = query?.data;
        return {
          id: e.id,
          label: e.label,
          savedAt: e.savedAt,
          invoiceNumber: invoice?.invoiceNumber,
          status: invoice?.status,
          totalAmount: invoice?.totalAmount,
          loading: query?.isLoading ?? false,
          failed: !!query?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  const recentOrderLabels = useMemo(
    () => new Map(recentOrders.entries.map((entry) => [entry.id, entry.label])),
    [recentOrders.entries],
  );

  const closeDrawer = () => setDrawerOpen(false);

  useEffect(() => {
    if (!lookedUp || lookedUp.id !== activeId) return;
    recent.push(lookedUp.id, invoiceLabel(lookedUp));
  }, [activeId, lookedUp, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter an invoice ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadInvoice = () => loadById(lookupId);

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
          recent.push(created.id, invoiceLabel(created));
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
            Create invoices and reopen recent invoices saved in this browser.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Invoice</Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Create is enabled against the live API. Needs a real <code className="text-xs">orderId</code> —
        failures surface in the error toast.
      </div>

      <RecentRecords
        title="Recent invoices"
        emptyHint="No recent invoices yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'number',
            header: 'Number',
            render: (row) => row.invoiceNumber || row.label || '—',
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (row.loading ? '…' : row.failed ? 'unavailable' : row.status ?? '—'),
          },
          {
            key: 'total',
            header: 'Total',
            render: (row) => (row.loading ? '…' : row.failed ? 'unavailable' : row.totalAmount ?? '—'),
          },
          {
            key: 'saved',
            header: 'Saved',
            render: (row) => new Date(row.savedAt).toLocaleString(),
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => loadById(row.id)}>
                  Open
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(row.id)}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
        rowKey={(row) => row.id}
        onClear={recent.clear}
      />

      <AdvancedIdLookup entityLabel="invoice" value={lookupId} onChange={setLookupId} onLoad={loadInvoice} />

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
                <span className="text-muted-foreground">Order:</span>{' '}
                {lookedUp.orderId
                  ? recentOrderLabels.get(lookedUp.orderId) ?? formatEntityLabel({ id: lookedUp.orderId })
                  : '—'}
                {lookedUp.orderId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => copyId(lookedUp.orderId!)}
                  >
                    Copy
                  </Button>
                ) : null}
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
            <Button type="submit" form="invoice-form" disabled={createMutation.isPending || !form.orderId}>
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
          <Field label="Order" required>
            <RecentIdPicker
              namespace={RECENT_NS.orders}
              value={form.orderId}
              onSelect={(id) => setForm({ ...form, orderId: id })}
              emptyHint="No recent orders in this browser. Create or open a Sales Order first — there is no order directory API."
            />
            <p className="mt-2 text-xs text-muted-foreground">or enter an ID</p>
            <Input
              className="mt-1"
              placeholder="Paste order ID"
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
