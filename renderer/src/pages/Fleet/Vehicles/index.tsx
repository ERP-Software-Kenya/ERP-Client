import { useState } from 'react';
import { DataTable, type Column } from '../../../components/DataTable';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { ViewDrawer } from '../../../components/ViewDrawer';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FormSelect } from '../../../components/FormSelect';
import { FleetVehicles, VehicleTypes, VehicleBrands, FuelTypes } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import { VehicleStatusBadge } from '../index';
import type { FleetVehicle, FleetVehicleStatus } from '../../../types';

const VEHICLE_STATUSES: FleetVehicleStatus[] = ['available', 'in_transit', 'maintenance', 'idle', 'out_of_service'];

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

const EMPTY: FormState = {
  vehicleNumber: '', vinNumber: '', vehicleTypeId: '', brandId: '',
  fuelTypeId: '', model: '', color: '', status: 'available',
};

const COLUMNS: Column<FleetVehicle>[] = [
  { key: 'vehicleNumber', label: 'Vehicle #',
    render: (v) => <span className="font-mono font-bold text-primary">{v.vehicleNumber}</span> },
  { key: 'registrationNumber', label: 'Reg. #', render: (v) => v.registrationNumber ?? '—' },
  { key: 'model', label: 'Model', render: (v) => v.model ?? '—' },
  { key: 'color', label: 'Color', render: (v) => v.color ?? '—' },
  { key: 'status', label: 'Status', render: (v) => <VehicleStatusBadge status={v.status} /> },
];

export default function FleetVehiclesPage(): React.JSX.Element {
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

  const { data: vehicleTypes = [], isLoading: typesLoading } = VehicleTypes.useList();
  const { data: vehicleBrands = [], isLoading: brandsLoading } = VehicleBrands.useList();
  const { data: fuelTypes = [], isLoading: fuelLoading } = FuelTypes.useList();

  const typeOptions  = vehicleTypes.map((t) => ({ value: t.id, label: t.name }));
  const brandOptions = vehicleBrands.map((b) => ({ value: b.id, label: b.brandName }));
  const fuelOptions  = fuelTypes.map((f) => ({ value: f.id, label: f.name }));
  const statusOptions = VEHICLE_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));

  const openCreate = (): void => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = (row: FleetVehicle): void => {
    setEditing(row);
    setForm({
      vehicleNumber: row.vehicleNumber,
      vinNumber:     row.vinNumber ?? '',
      vehicleTypeId: row.vehicleTypeId,
      brandId:       row.brandId,
      fuelTypeId:    row.fuelTypeId,
      model:         row.model ?? '',
      color:         row.color ?? '',
      status:        (row.status as FleetVehicleStatus) ?? 'available',
    });
    setDrawerOpen(true);
  };
  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.vehicleNumber.trim() || !form.vehicleTypeId || !form.brandId || !form.fuelTypeId) return;
    const body: Partial<FleetVehicle> = {
      vehicleNumber: form.vehicleNumber.trim(),
      vinNumber:     form.vinNumber.trim() || undefined,
      vehicleTypeId: form.vehicleTypeId,
      brandId:       form.brandId,
      fuelTypeId:    form.fuelTypeId,
      model:         form.model.trim() || undefined,
      color:         form.color.trim() || undefined,
      status:        form.status,
    };
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, body: { vehicleNumber: body.vehicleNumber, vinNumber: body.vinNumber, vehicleTypeId: body.vehicleTypeId, status: body.status } },
        { onSuccess: closeDrawer },
      );
    } else {
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Vehicles"
        description="Manage your fleet vehicles"
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
            <Input
              value={form.vehicleNumber}
              onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value }))}
              placeholder="e.g. VH-001"
              required
              disabled={!!editing}
            />
          </Field>
          <Field label="VIN Number">
            <Input
              value={form.vinNumber}
              onChange={(e) => setForm((f) => ({ ...f, vinNumber: e.target.value }))}
              placeholder="17-character VIN"
              maxLength={17}
              className="font-mono"
            />
          </Field>
          <Field label="Vehicle Type" required>
            <FormSelect
              value={form.vehicleTypeId}
              onChange={(val) => setForm((f) => ({ ...f, vehicleTypeId: val }))}
              options={typeOptions}
              placeholder="Select vehicle type…"
              loading={typesLoading}
            />
          </Field>
          <Field label="Brand" required>
            <FormSelect
              value={form.brandId}
              onChange={(val) => setForm((f) => ({ ...f, brandId: val }))}
              options={brandOptions}
              placeholder="Select brand…"
              loading={brandsLoading}
            />
          </Field>
          <Field label="Fuel Type" required>
            <FormSelect
              value={form.fuelTypeId}
              onChange={(val) => setForm((f) => ({ ...f, fuelTypeId: val }))}
              options={fuelOptions}
              placeholder="Select fuel type…"
              loading={fuelLoading}
            />
          </Field>
          <Field label="Model">
            <Input
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              placeholder="e.g. Cascadia 2021"
            />
          </Field>
          <Field label="Color">
            <Input
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              placeholder="e.g. White"
            />
          </Field>
          {editing && (
            <Field label="Status">
              <FormSelect
                value={form.status}
                onChange={(val) => setForm((f) => ({ ...f, status: val as FleetVehicleStatus }))}
                options={statusOptions}
              />
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
