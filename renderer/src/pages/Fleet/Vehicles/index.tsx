import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { DataTable, type Column } from '../../../components/DataTable';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { ViewDrawer } from '../../../components/ViewDrawer';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FleetVehicles } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import { VehicleStatusBadge } from '../index';
import type { FleetVehicle, FleetVehicleStatus } from '../../../types';
import { toast } from 'sonner';

const VEHICLE_STATUSES: FleetVehicleStatus[] = ['available', 'in_transit', 'maintenance', 'idle', 'out_of_service'];

const SEED_SQL = `-- Run once in your Postgres console to seed reference data
INSERT INTO core.vehicle_types (name, description) VALUES
  ('Truck', 'Heavy-duty truck'), ('Van', 'Light delivery van'),
  ('Car', 'Passenger car'), ('Bus', 'Passenger bus'), ('Trailer', 'Semi-trailer')
ON CONFLICT DO NOTHING;

INSERT INTO core.vehicle_brands (brand_name) VALUES
  ('Toyota'), ('Ford'), ('Mercedes'), ('Volvo'), ('Tata')
ON CONFLICT DO NOTHING;

INSERT INTO core.fuel_types (name) VALUES
  ('Diesel'), ('Petrol'), ('CNG'), ('Electric')
ON CONFLICT DO NOTHING;

-- Fetch UUIDs to use in the form:
SELECT id, name FROM core.vehicle_types;
SELECT id, brand_name FROM core.vehicle_brands;
SELECT id, name FROM core.fuel_types;`;

function SeedPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-amber-600 font-medium"
      >
        <span>Vehicle Types, Brands & Fuel Types must be seeded — click for SQL</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <pre className="text-xs bg-background border border-border rounded-lg p-3 overflow-x-auto text-foreground whitespace-pre-wrap">{SEED_SQL}</pre>
          <Button variant="outline" size="sm" className="mt-2"
            onClick={() => { void navigator.clipboard.writeText(SEED_SQL); toast.success('SQL copied'); }}>
            <Copy size={14} className="mr-1" /> Copy SQL
          </Button>
        </div>
      )}
    </div>
  );
}

interface FormState {
  vehicleNumber: string;
  vinNumber: string;
  vehicleTypeId: string;
  brandId: string;
  fuelTypeId: string;
  model: string;
  color: string;
  status: FleetVehicleStatus;
}

const EMPTY: FormState = { vehicleNumber: '', vinNumber: '', vehicleTypeId: '', brandId: '', fuelTypeId: '', model: '', color: '', status: 'available' };

const COLUMNS: Column<FleetVehicle>[] = [
  { key: 'vehicleNumber', label: 'Vehicle #',
    render: (v) => <span className="font-mono font-bold text-primary">{v.vehicleNumber}</span> },
  { key: 'registrationNumber', label: 'Reg. #', render: (v) => v.registrationNumber ?? '—' },
  { key: 'model', label: 'Model', render: (v) => v.model ?? '—' },
  { key: 'color', label: 'Color', render: (v) => v.color ?? '—' },
  { key: 'status', label: 'Status', render: (v) => <VehicleStatusBadge status={v.status} /> },
];

export default function FleetVehiclesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FleetVehicle | null>(null);
  const [viewRow, setViewRow] = useState<FleetVehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FleetVehicle | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const createMutation = FleetVehicles.useCreate();
  const updateMutation = FleetVehicles.useUpdate();
  const deleteMutation = FleetVehicles.useDelete();

  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, isError, error, refetch } = FleetVehicles.useSearch({ page, search: debouncedSearch });
  const rows  = data?.items ?? [];
  const total = data?.total ?? 0;

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = (row: FleetVehicle) => {
    setEditing(row);
    setForm({ vehicleNumber: row.vehicleNumber, vinNumber: row.vinNumber ?? '', vehicleTypeId: row.vehicleTypeId, brandId: row.brandId, fuelTypeId: row.fuelTypeId, model: row.model ?? '', color: row.color ?? '', status: (row.status as FleetVehicleStatus) ?? 'available' });
    setDrawerOpen(true);
  };
  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.vehicleNumber.trim() || !form.vehicleTypeId.trim() || !form.brandId.trim() || !form.fuelTypeId.trim()) return;
    const body: Partial<FleetVehicle> = {
      vehicleNumber: form.vehicleNumber.trim(),
      vinNumber:     form.vinNumber.trim() || undefined,
      vehicleTypeId: form.vehicleTypeId.trim(),
      brandId:       form.brandId.trim(),
      fuelTypeId:    form.fuelTypeId.trim(),
      model:         form.model.trim() || undefined,
      color:         form.color.trim() || undefined,
      status:        form.status,
    };
    if (editing) {
      // UpdateVehicleRequest accepts: vehicleNumber, vinNumber, vehicleTypeId, status
      updateMutation.mutate({ id: editing.id, body: { vehicleNumber: body.vehicleNumber, vinNumber: body.vinNumber, vehicleTypeId: body.vehicleTypeId, status: body.status } }, { onSuccess: closeDrawer });
    } else { createMutation.mutate(body, { onSuccess: closeDrawer }); }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <SeedPanel />

      <DataTable
        title="Vehicles"
        description="Manage your fleet vehicles — CRUD wired to /api/v1/vehicles"
        columns={COLUMNS}
        rows={rows}
        total={total}
        page={page}
        loading={isLoading}
        error={isError ? `Failed to load vehicles: ${error instanceof Error ? error.message : 'Unknown error'}` : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search vehicles…"
        isAdmin={true}
        onAdd={openCreate}
        addLabel="Add Vehicle"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow !== null}
        title={`Vehicle — ${viewRow?.vehicleNumber ?? ''}`}
        data={viewRow as unknown as Record<string, unknown>}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? `Edit Vehicle — ${editing.vehicleNumber}` : 'Add Vehicle'}
        footer={
          <>
            <Button type="submit" form="vehicle-form" disabled={isSaving || !form.vehicleNumber.trim()}>
              {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Vehicle Number" required>
            <Input value={form.vehicleNumber} onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value }))}
              placeholder="e.g. VH-001" required disabled={!!editing} />
          </Field>
          <Field label="VIN Number">
            <Input value={form.vinNumber} onChange={(e) => setForm((f) => ({ ...f, vinNumber: e.target.value }))}
              placeholder="17-character VIN" maxLength={17} className="font-mono" />
          </Field>
          <Field label="Vehicle Type ID (UUID)" required hint="From core.vehicle_types — see SQL above">
            <Input value={form.vehicleTypeId} onChange={(e) => setForm((f) => ({ ...f, vehicleTypeId: e.target.value }))}
              placeholder="Paste UUID" required className="font-mono text-xs" />
          </Field>
          <Field label="Brand ID (UUID)" required hint="From core.vehicle_brands — see SQL above">
            <Input value={form.brandId} onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
              placeholder="Paste UUID" required className="font-mono text-xs" />
          </Field>
          <Field label="Fuel Type ID (UUID)" required hint="From core.fuel_types — see SQL above">
            <Input value={form.fuelTypeId} onChange={(e) => setForm((f) => ({ ...f, fuelTypeId: e.target.value }))}
              placeholder="Paste UUID" required className="font-mono text-xs" />
          </Field>
          <Field label="Model">
            <Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="e.g. Cascadia 2021" />
          </Field>
          <Field label="Color">
            <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="e.g. White" />
          </Field>
          {editing && (
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FleetVehicleStatus }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {VEHICLE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
          )}
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Vehicle"
        description={`Delete vehicle "${deleteTarget?.vehicleNumber}"? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  );
}
