import { useState } from 'react';
import { DataTable, type Column } from '../../../components/DataTable';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { ViewDrawer } from '../../../components/ViewDrawer';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FleetDrivers } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import { DriverStatusBadge } from '../index';
import type { FleetDriver, FleetDriverStatus } from '../../../types';


interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseType: string;
  employeeId: string;
  address: string;
  emergencyContact: string;
  status: FleetDriverStatus;
}

const EMPTY: FormState = { firstName: '', lastName: '', phone: '', email: '', licenseNumber: '', licenseType: '', employeeId: '', address: '', emergencyContact: '', status: 'active' };

const COLUMNS: Column<FleetDriver>[] = [
  { key: 'firstName', label: 'Name',
    render: (d) => (
      <div>
        <div className="font-semibold text-foreground">{d.firstName} {d.lastName}</div>
        {d.employeeId && <div className="text-xs text-muted-foreground">{d.employeeId}</div>}
      </div>
    )},
  { key: 'phone',         label: 'Phone',     render: (d) => d.phone },
  { key: 'licenseNumber', label: 'License',   render: (d) => <span className="font-mono text-xs">{d.licenseNumber}</span> },
  { key: 'licenseType',   label: 'Lic. Type', render: (d) => d.licenseType ?? '—' },
  { key: 'status',        label: 'Status',    render: (d) => <DriverStatusBadge status={d.status} /> },
];

export default function FleetDriversPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FleetDriver | null>(null);
  const [viewRow, setViewRow] = useState<FleetDriver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FleetDriver | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const createMutation = FleetDrivers.useCreate();
  const updateMutation = FleetDrivers.useUpdate();
  const deleteMutation = FleetDrivers.useDelete();

  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, isError, error, refetch } = FleetDrivers.useSearch({ page, search: debouncedSearch });
  const rows  = data?.items ?? [];
  const total = data?.total ?? 0;

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = (row: FleetDriver) => {
    setEditing(row);
    setForm({ firstName: row.firstName, lastName: row.lastName, phone: row.phone, email: row.email ?? '', licenseNumber: row.licenseNumber, licenseType: row.licenseType ?? '', employeeId: row.employeeId ?? '', address: row.address ?? '', emergencyContact: row.emergencyContact ?? '', status: (row.status as FleetDriverStatus) ?? 'active' });
    setDrawerOpen(true);
  };
  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.licenseNumber.trim()) return;
    const body: Partial<FleetDriver> = {
      firstName:        form.firstName.trim(),
      lastName:         form.lastName.trim(),
      phone:            form.phone.trim(),
      email:            form.email.trim() || undefined,
      licenseNumber:    form.licenseNumber.trim(),
      licenseType:      form.licenseType.trim() || undefined,
      employeeId:       form.employeeId.trim() || undefined,
      address:          form.address.trim() || undefined,
      emergencyContact: form.emergencyContact.trim() || undefined,
    };
    // UpdateDriverRequest does not include status — it will be ignored by the backend
    if (editing) { updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer }); }
    else { createMutation.mutate(body, { onSuccess: closeDrawer }); }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Drivers"
        description="Manage your fleet drivers"
        columns={COLUMNS}
        rows={rows}
        total={total}
        page={page}
        loading={isLoading}
        error={isError ? `Failed to load drivers: ${error instanceof Error ? error.message : 'Unknown error'}` : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search drivers…"
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Add Driver"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow !== null}
        title={`Driver — ${viewRow?.firstName ?? ''} ${viewRow?.lastName ?? ''}`}
        data={viewRow as unknown as Record<string, unknown>}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? `Edit Driver — ${editing.firstName} ${editing.lastName}` : 'Add Driver'}
        footer={
          <>
            <Button type="submit" form="driver-form" disabled={isSaving || !form.firstName.trim() || !form.licenseNumber.trim()}>
              {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="driver-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" required>
              <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" required />
            </Field>
            <Field label="Last Name" required>
              <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" required />
            </Field>
          </div>
          <Field label="Phone" required>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91-XXXXXXXXXX" required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="driver@company.com" />
          </Field>
          <Field label="License Number" required>
            <Input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} placeholder="e.g. MH-0120230012345" required className="font-mono" />
          </Field>
          <Field label="License Type">
            <Input value={form.licenseType} onChange={(e) => setForm((f) => ({ ...f, licenseType: e.target.value }))} placeholder="e.g. Heavy Transport" />
          </Field>
          <Field label="Employee ID">
            <Input value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} placeholder="e.g. EMP-001" />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Full address" />
          </Field>
          <Field label="Emergency Contact">
            <Input value={form.emergencyContact} onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))} placeholder="Name — Phone" />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Driver"
        description={`Delete driver "${deleteTarget?.firstName} ${deleteTarget?.lastName}"? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  );
}
