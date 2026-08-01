import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Bills, Customers, Locations } from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { formatEntityLabel, truncateId } from '../lib/entityLabel';
import type { Bill, BillStatus, CreateBillInput, Customer } from '../types';

const STATUS_FILTERS: Array<BillStatus | 'ALL'> = [
  'ALL',
  'INITIATED',
  'DRAFT',
  'COMPLETED',
  'CANCELLED',
];

interface FormState {
  locationId: string;
  customerId: string;
  customerLabel: string;
  walkInName: string;
  walkInPhone: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  locationId: '',
  customerId: '',
  customerLabel: '',
  walkInName: '',
  walkInPhone: '',
  notes: '',
};

function partyLabel(row: Bill, customerName: Map<string, string>): string {
  if (row.walkInName) return row.walkInName;
  if (row.customerId) {
    const name = customerName.get(row.customerId);
    if (name) return name;
    return `Customer ${truncateId(row.customerId)}`;
  }
  return '—';
}

function money(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

export default function BillsPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Bill | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'ALL'>('ALL');
  const [locationFilter, setLocationFilter] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const debouncedCustomerQuery = useDebounce(customerQuery, 300);

  const createMutation = Bills.useCreate();
  const removeMutation = Bills.useDelete();
  const { data: locations = [] } = Locations.useList();
  // Customers have no reliable /list (pagination 400) — omitPagination search for name map.
  const { data: customersPage } = Customers.useSearch({});
  const customers = customersPage?.items ?? [];
  const { data: customerSearch } = Customers.useSearch({
    page: 1,
    limit: 8,
    search:
      drawerOpen && !form.customerId && debouncedCustomerQuery.trim().length >= 2
        ? debouncedCustomerQuery.trim()
        : undefined,
    enabled: drawerOpen && !form.customerId && debouncedCustomerQuery.trim().length >= 2,
  });
  // Bills SearchBillsRequest omits $page/$perPage (omitPagination) — single API default page only.
  // /bills/list not switched: same family as search; omitPagination search remains the safe path.
  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (statusFilter !== 'ALL') next.status = statusFilter;
    if (locationFilter) next.locationId = locationFilter;
    return Object.keys(next).length ? next : undefined;
  }, [statusFilter, locationFilter]);

  const { data, isLoading, isError, error, refetch } = Bills.useSearch({ filters });
  const listError = isError
    ? `Unable to load bills.${error instanceof Error && error.message ? ` (${error.message})` : ''}`
    : null;
  const billRows = listError ? [] : (data?.items ?? []);
  const billCount = billRows.length;

  const locationName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : l.name);
    }
    return m;
  }, [locations]);

  const customerName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) {
      m.set(c.id, formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }));
    }
    return m;
  }, [customers]);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      locationId: locations[0]?.id ?? '',
    });
    setCustomerQuery('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const canSubmit =
    !!form.locationId && (!!form.customerId || !!form.walkInName.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const body: CreateBillInput = {
      locationId: form.locationId,
      customerId: form.customerId || undefined,
      walkInName: form.customerId ? undefined : form.walkInName.trim(),
      walkInPhone: form.customerId ? undefined : form.walkInPhone.trim() || undefined,
      notes: form.notes.trim() || undefined,
      items: [],
    };

    createMutation.mutate(body as Partial<Bill>, {
      onSuccess: (created) => {
        closeDrawer();
        if (created?.id) navigate(`/bills/${created.id}`);
      },
    });
  };

  const columns: Column<Bill>[] = [
    {
      key: 'billNumber',
      label: 'Bill #',
      render: (row) => row.billNumber || truncateId(row.id),
    },
    {
      key: 'party',
      label: 'Customer',
      render: (row) => partyLabel(row, customerName),
    },
    {
      key: 'locationId',
      label: 'Location',
      render: (row) =>
        formatEntityLabel({
          name: locationName.get(row.locationId),
          id: row.locationId,
        }),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => row.status || '—',
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row) => money(row.totalAmount),
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (row) => row.paymentMethod || '—',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
    },
  ];

  const canDelete = (row: Bill) => row.status === 'INITIATED' || row.status === 'DRAFT';

  const viewData = viewRow
    ? ({
        ...viewRow,
        locationId: formatEntityLabel({
          name: locationName.get(viewRow.locationId),
          id: viewRow.locationId,
        }),
        customerId: viewRow.walkInName
          ? viewRow.walkInName
          : viewRow.customerId
            ? partyLabel(viewRow, customerName)
            : '—',
      } as Record<string, unknown>)
    : null;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <p className="text-xs text-muted-foreground">
        API gap: Bills have no free-text search — filter by status and location only.
      </p>
      <DataTable
        title="Bills"
        description="Sales bills — create, review, then complete from detail or POS."
        columns={columns}
        rows={billRows}
        total={billCount}
        page={1}
        limit={Math.max(billCount, 1)}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={() => {}}
        hideSearch
        footerNote="Showing first page of results — refine filters/search; server pagination pending"
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All' : s}
              </Button>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">Location:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type ? `${l.name} (${l.type})` : l.name}
                </option>
              ))}
            </select>
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => setViewRow(row)}
        onEdit={(row) => navigate(`/bills/${row.id}`)}
        canDelete={canDelete}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Bill"
        data={viewData}
        onClose={() => setViewRow(null)}
      >
        {viewRow && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              const id = viewRow.id;
              setViewRow(null);
              navigate(`/bills/${id}`);
            }}
          >
            Open full page
          </Button>
        )}
      </ViewDrawer>

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Bill"
        footer={
          <>
            <Button
              type="submit"
              form="bill-form"
              disabled={createMutation.isPending || !canSubmit}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="bill-form" onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Creates an <code className="text-[10px]">INITIATED</code> bill. Link a customer or enter
            walk-in name. Add items and complete on the detail page or via POS.
          </p>
          <Field label="Location">
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
              required
            >
              <option value="">Select location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type ? `${l.name} (${l.type})` : l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer (search)">
            {form.customerId ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span>{form.customerLabel || truncateId(form.customerId)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm({ ...form, customerId: '', customerLabel: '' })
                  }
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
                  <div className="max-h-36 overflow-y-auto rounded-md border border-border">
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
                            walkInName: '',
                            walkInPhone: '',
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
          {!form.customerId && (
            <>
              <Field label="Walk-in name">
                <Input
                  value={form.walkInName}
                  onChange={(e) => setForm({ ...form, walkInName: e.target.value })}
                  placeholder="Required if no customer linked"
                  required
                />
              </Field>
              <Field label="Walk-in phone">
                <Input
                  value={form.walkInPhone}
                  onChange={(e) => setForm({ ...form, walkInPhone: e.target.value })}
                  placeholder="Optional"
                />
              </Field>
            </>
          )}
          <Field label="Notes">
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Bill"
        description="Soft-delete this bill? Only INITIATED or DRAFT bills can be deleted."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
