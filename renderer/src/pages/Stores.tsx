import { useMemo, useState } from 'react';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Stores, Organizations } from '../api';
import { usePagination } from '../hooks/usePagination';
import { formatEntityLabel } from '../lib/entityLabel';
import type { Store } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface FormState {
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  organization_id: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  organization_id: '',
  status: 'active',
};

export default function StoresPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);
  const [viewRow, setViewRow] = useState<Store | null>(null);

  const createMutation = Stores.useCreate();
  const updateMutation = Stores.useUpdate();
  const removeMutation = Stores.useDelete();
  const [orgFilter, setOrgFilter] = useState('');
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data: organizations = [] } = Organizations.useList();
  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (orgFilter) next.organizationId = orgFilter;
    return Object.keys(next).length ? next : undefined;
  }, [orgFilter]);
  const { data, isLoading, error, refetch } = Stores.useSearch({
    page,
    search: debouncedSearch,
    filters,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: Store) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      address: row.address ?? '',
      city: row.city ?? '',
      country: row.country ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      organization_id: row.organization_id ?? '',
      status: row.status ?? 'active',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Store> = {
      name: form.name,
      code: form.code || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      organization_id: form.organization_id || undefined,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const columns: Column<Store>[] = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'city', label: 'City', render: (row) => row.city || '—' },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
    { key: 'address', label: 'Address' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Stores"
        description="Manage sales stores (organization locations used by orders, users, and expenses)."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Organization:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={orgFilter}
              onChange={(e) => {
                setOrgFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {formatEntityLabel({ name: o.name, code: o.code, id: o.id })}
                </option>
              ))}
            </select>
          </>
        }
        onRefetch={() => void refetch()}
        searchPlaceholder="Search stores…"
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Store"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Store' : 'Add Store'}
        footer={
          <>
            <Button type="submit" form="store-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="store-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label="Code">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Organization">
            <ResourceSelect
              resource={Organizations}
              getLabel={(org) => org.name}
              value={form.organization_id}
              onValueChange={(v) => setForm({ ...form, organization_id: v })}
              placeholder="Select organization…"
              allowNone
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Store"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
