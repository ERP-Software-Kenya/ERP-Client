import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { ResourceSelect } from '../components/ResourceSelect';
import { RecentRecords } from '../components/RecentRecords';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Customers, get, Orders, Stores } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { formatEntityLabel } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { Customer, Order } from '../types';

interface FormState {
  storeId: string;
  customerId: string;
  customerLabel: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paymentStatus: string;
}

const EMPTY_FORM: FormState = {
  storeId: '',
  customerId: '',
  customerLabel: '',
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
  const recent = useRecentIds(RECENT_NS.orders);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Order | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();
  const [customerQuery, setCustomerQuery] = useState('');
  const debouncedCustomerQuery = useDebounce(customerQuery, 300);

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = Orders.useCreate();
  const { data: lookedUp, isLoading, error } = Orders.useGet(activeId);
  const { data: stores } = Stores.useList();
  const customerIdForLabel = lookedUp?.customerId ?? lastCreated?.customerId;
  const { data: linkedCustomer } = Customers.useGet(customerIdForLabel);
  const { data: customerSearch } = Customers.useSearch({
    page: 1,
    limit: 8,
    search:
      drawerOpen && !form.customerId && debouncedCustomerQuery.trim().length >= 2
        ? debouncedCustomerQuery.trim()
        : undefined,
    enabled: drawerOpen && !form.customerId && debouncedCustomerQuery.trim().length >= 2,
  });

  const storeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stores ?? []) {
      m.set(s.id, formatEntityLabel({ name: s.name, code: s.code, id: s.id }));
    }
    return m;
  }, [stores]);

  const customerLabelFor = useCallback(
    (customerId: string | undefined) => {
      if (!customerId) return '—';
      if (linkedCustomer?.id === customerId) {
        return formatEntityLabel({
          name: linkedCustomer.name,
          phone: linkedCustomer.phone,
          id: linkedCustomer.id,
        });
      }
      return formatEntityLabel({ id: customerId });
    },
    [linkedCustomer],
  );

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['orders', e.id] as const,
      queryFn: () => get<Order>(`/api/v1/orders/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(
    () =>
      recent.entries.map((e, i) => {
        const q = i < HYDRATE_LIMIT ? recentQueries[i] : undefined;
        const data = q?.data;
        return {
          id: e.id,
          label: e.label,
          savedAt: e.savedAt,
          orderNumber: data?.orderNumber,
          status: data?.status,
          paymentStatus: data?.paymentStatus,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loadedOrder = lookedUp;
    if (!loadedOrder || loadedOrder.id !== activeId) return;
    recent.push(
      loadedOrder.id,
      loadedOrder.orderNumber ?? customerLabelFor(loadedOrder.customerId),
    );
  }, [activeId, customerLabelFor, lookedUp, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter an order ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadOrder = () => loadById(lookupId);

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
          recent.push(
            created.id,
            created.orderNumber ?? form.customerLabel ?? customerLabelFor(created.customerId),
          );
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
            Create orders and reopen recent orders saved in this browser.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setCustomerQuery('');
            setDrawerOpen(true);
          }}
        >
          New Sales Order
        </Button>
      </div>

      <RecentRecords
        title="Recent orders"
        emptyHint="No recent orders yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'number',
            header: 'Number',
            render: (r) => r.orderNumber || r.label || '—',
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (r.loading ? '…' : r.failed ? 'unavailable' : r.status ?? '—'),
          },
          {
            key: 'payment',
            header: 'Payment',
            render: (r) => (r.loading ? '…' : r.failed ? 'unavailable' : r.paymentStatus ?? '—'),
          },
          {
            key: 'saved',
            header: 'Saved',
            render: (r) => new Date(r.savedAt).toLocaleString(),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => loadById(r.id)}>
                  Open
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(r.id)}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
        rowKey={(r) => r.id}
        onClear={recent.clear}
      />

      <AdvancedIdLookup
        entityLabel="order"
        value={lookupId}
        onChange={setLookupId}
        onLoad={loadOrder}
      />

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
                <span className="text-muted-foreground">Store:</span>{' '}
                {lookedUp.storeId
                  ? storeName.get(lookedUp.storeId) ?? formatEntityLabel({ id: lookedUp.storeId })
                  : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Customer:</span>{' '}
                {customerLabelFor(lookedUp.customerId)}
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
            <Button
              type="submit"
              form="order-form"
              disabled={createMutation.isPending || !form.storeId || !form.customerId}
            >
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
              getLabel={(s) => formatEntityLabel({ name: s.name, code: s.code, id: s.id })}
              value={form.storeId}
              onValueChange={(v) => setForm({ ...form, storeId: v })}
              placeholder="Select store…"
            />
          </Field>
          <Field label="Customer (search)" required>
            {form.customerId ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span>{form.customerLabel || formatEntityLabel({ id: form.customerId })}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setForm({ ...form, customerId: '', customerLabel: '' })}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <Input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Type name to search…"
                />
                {(customerSearch?.items?.length ?? 0) > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-md border border-border custom-scrollbar">
                    {(customerSearch?.items ?? []).map((c: Customer) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setForm({
                            ...form,
                            customerId: c.id,
                            customerLabel: formatEntityLabel({
                              name: c.name,
                              phone: c.phone,
                              id: c.id,
                            }),
                          });
                          setCustomerQuery('');
                        }}
                      >
                        {c.name || 'Unnamed'}
                        {c.phone ? (
                          <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
