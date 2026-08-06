import { useState, useMemo } from 'react';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ViewDrawer } from '../../components/ViewDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Customers, Organizations } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { Customer } from '../../types';

interface FormState {
  name: string;
  email: string;
  phone: string;
  gstin: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', gstin: '' };

export default function CustomersPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewRow, setViewRow] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const createMutation = Customers.useCreate();
  const updateMutation = Customers.useUpdate();
  const removeMutation = Customers.useDelete();
  const { data: orgs } = Organizations.useList();
  const orgName = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgs ?? []) m.set(o.id, formatEntityLabel({ name: o.name, id: o.id }));
    return m;
  }, [orgs]);
  // Customers SearchCustomersRequest omits $page/$perPage — single API default page only.
  const { setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, isError, error, refetch } = Customers.useSearch({
    search: debouncedSearch,
  });
  const listError = isError
    ? `Unable to load customers.${error instanceof Error && error.message ? ` (${error.message})` : ''}`
    : null;
  const customerRows = listError ? [] : (data?.items ?? []);
  const customerCount = customerRows.length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: Customer) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      gstin: row.gstin ?? '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const body = {
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
      return;
    }
    createMutation.mutate(body, { onSuccess: closeDrawer });
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => row.name || '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => row.phone || '—',
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => row.email || '—',
    },
    {
      key: 'gstin',
      label: 'GSTIN',
      render: (row) => row.gstin || '—',
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const viewData = viewRow
    ? ({
        ...viewRow,
        organizationId: viewRow.organizationId ? (orgName.get(viewRow.organizationId) ?? viewRow.organizationId) : undefined,
      } as Record<string, unknown>)
    : null;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Customers"
        description="Search, create, and update customers for sales bills."
        columns={columns}
        rows={customerRows}
        total={customerCount}
        page={1}
        limit={Math.max(customerCount, 1)}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={() => {}}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search by name…"
        footerNote="Showing first page of results — refine filters/search; server pagination pending"
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Register Customer"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Customer"
        data={viewData}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <Button type="submit" form="customer-form" disabled={isSaving || !form.name.trim()}>
              {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Customer"
        description="Soft-delete this customer?"
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
