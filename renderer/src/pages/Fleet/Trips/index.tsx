import { useState } from 'react';
import { DataTable, type Column } from '../../../components/DataTable';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { ViewDrawer } from '../../../components/ViewDrawer';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FormSelect } from '../../../components/FormSelect';
import { FleetTrips, FleetVehicles, FleetDrivers, Customers } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import { TripStatusBadge } from '../index';
import type { FleetTrip, FleetTripStatus } from '../../../types';

const TRIP_STATUSES: FleetTripStatus[] = ['scheduled', 'in_transit', 'completed', 'cancelled', 'delayed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const STATUS_OPTIONS  = TRIP_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));
const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));

interface FormState {
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  customerId: string;
  pickupLocation: string;
  dropLocation: string;
  startDatetime: string;
  estimatedDistance: string;
  priority: string;
  tripStatus: FleetTripStatus;
  remarks: string;
}

const EMPTY: FormState = {
  tripNumber: '', vehicleId: '', driverId: '', customerId: '',
  pickupLocation: '', dropLocation: '', startDatetime: '',
  estimatedDistance: '', priority: 'medium', tripStatus: 'scheduled', remarks: '',
};

const COLUMNS: Column<FleetTrip>[] = [
  { key: 'tripNumber', label: 'Trip #',
    render: (t) => <span className="font-mono font-bold text-primary">{t.tripNumber}</span> },
  { key: 'pickupLocation', label: 'Pickup',
    render: (t) => <span className="max-w-[120px] truncate block" title={t.pickupLocation}>{t.pickupLocation}</span> },
  { key: 'dropLocation', label: 'Drop',
    render: (t) => <span className="max-w-[120px] truncate block" title={t.dropLocation}>{t.dropLocation}</span> },
  { key: 'startDatetime', label: 'Start',
    render: (t) => t.startDatetime ? new Date(t.startDatetime).toLocaleString() : '—' },
  { key: 'tripStatus', label: 'Status', render: (t) => <TripStatusBadge status={t.tripStatus} /> },
  { key: 'priority', label: 'Priority',
    render: (t) => <span className="capitalize text-muted-foreground text-xs">{t.priority}</span> },
];

export default function FleetTripsPage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FleetTrip | null>(null);
  const [viewRow, setViewRow] = useState<FleetTrip | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FleetTrip | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const createMutation = FleetTrips.useCreate();
  const updateMutation = FleetTrips.useUpdate();
  const deleteMutation = FleetTrips.useDelete();

  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, isError, error, refetch } = FleetTrips.useSearch({ page, search: debouncedSearch });
  const rows  = data?.items ?? [];
  const total = data?.total ?? 0;

  const { data: vehicles = [], isLoading: vehiclesLoading } = FleetVehicles.useList();
  const { data: drivers = [], isLoading: driversLoading }   = FleetDrivers.useList();
  const { data: customersResult } = Customers.useSearch({ enabled: true });
  const customers = customersResult?.items ?? [];

  const vehicleOptions  = vehicles.map((v) => ({ value: v.id, label: v.vehicleNumber + (v.model ? ` — ${v.model}` : '') }));
  const driverOptions   = drivers.map((d) => ({ value: d.id, label: `${d.firstName} ${d.lastName}` }));
  const customerOptions = customers.map((c) => ({ value: c.id, label: c.name ?? c.id }));

  const openCreate = (): void => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = (row: FleetTrip): void => {
    setEditing(row);
    setForm({
      tripNumber:        row.tripNumber,
      vehicleId:         row.vehicleId,
      driverId:          row.driverId,
      customerId:        row.customerId,
      pickupLocation:    row.pickupLocation,
      dropLocation:      row.dropLocation,
      startDatetime:     row.startDatetime ? row.startDatetime.slice(0, 16) : '',
      estimatedDistance: row.estimatedDistance != null ? String(row.estimatedDistance) : '',
      priority:          row.priority,
      tripStatus:        row.tripStatus,
      remarks:           '',
    });
    setDrawerOpen(true);
  };
  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, body: { tripStatus: form.tripStatus, remarks: form.remarks || undefined } as Partial<FleetTrip> },
        { onSuccess: closeDrawer },
      );
    } else {
      if (!form.tripNumber.trim() || !form.vehicleId || !form.driverId || !form.customerId || !form.startDatetime) return;
      const body: Partial<FleetTrip> = {
        tripNumber:        form.tripNumber.trim(),
        vehicleId:         form.vehicleId,
        driverId:          form.driverId,
        customerId:        form.customerId,
        pickupLocation:    form.pickupLocation.trim(),
        dropLocation:      form.dropLocation.trim(),
        startDatetime:     new Date(form.startDatetime).toISOString(),
        estimatedDistance: form.estimatedDistance ? parseFloat(form.estimatedDistance) : undefined,
        priority:          form.priority,
      };
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Trips"
        description="Schedule and track fleet trips"
        columns={COLUMNS}
        rows={rows}
        total={total}
        page={page}
        loading={isLoading}
        error={isError ? `Failed to load trips: ${error instanceof Error ? error.message : 'Unknown error'}` : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search trips…"
        isAdmin={true}
        onAdd={openCreate}
        addLabel="New Trip"
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow !== null}
        title={`Trip — ${viewRow?.tripNumber ?? ''}`}
        data={viewRow as unknown as Record<string, unknown>}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? `Update Trip — ${editing.tripNumber}` : 'Schedule New Trip'}
        footer={
          <>
            <Button type="submit" form="trip-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="trip-form" onSubmit={handleSubmit} className="space-y-4">
          {editing ? (
            <>
              <Field label="Status">
                <FormSelect
                  value={form.tripStatus}
                  onChange={(val) => setForm((f) => ({ ...f, tripStatus: val as FleetTripStatus }))}
                  options={STATUS_OPTIONS}
                />
              </Field>
              <Field label="Remarks">
                <Input
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Optional remarks"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Trip Number" required>
                <Input
                  value={form.tripNumber}
                  onChange={(e) => setForm((f) => ({ ...f, tripNumber: e.target.value }))}
                  placeholder="e.g. TRIP-2024-001"
                  required
                />
              </Field>
              <Field label="Vehicle" required>
                <FormSelect
                  value={form.vehicleId}
                  onChange={(val) => setForm((f) => ({ ...f, vehicleId: val }))}
                  options={vehicleOptions}
                  placeholder="Select vehicle…"
                  loading={vehiclesLoading}
                />
              </Field>
              <Field label="Driver" required>
                <FormSelect
                  value={form.driverId}
                  onChange={(val) => setForm((f) => ({ ...f, driverId: val }))}
                  options={driverOptions}
                  placeholder="Select driver…"
                  loading={driversLoading}
                />
              </Field>
              <Field label="Customer" required>
                <FormSelect
                  value={form.customerId}
                  onChange={(val) => setForm((f) => ({ ...f, customerId: val }))}
                  options={customerOptions}
                  placeholder="Select customer…"
                />
              </Field>
              <Field label="Pickup Location" required>
                <Input
                  value={form.pickupLocation}
                  onChange={(e) => setForm((f) => ({ ...f, pickupLocation: e.target.value }))}
                  placeholder="e.g. Mumbai Warehouse, Gate 3"
                  required
                />
              </Field>
              <Field label="Drop Location" required>
                <Input
                  value={form.dropLocation}
                  onChange={(e) => setForm((f) => ({ ...f, dropLocation: e.target.value }))}
                  placeholder="e.g. Delhi Distribution Center"
                  required
                />
              </Field>
              <Field label="Start Date & Time" required>
                <Input
                  type="datetime-local"
                  value={form.startDatetime}
                  onChange={(e) => setForm((f) => ({ ...f, startDatetime: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Estimated Distance (km)">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.estimatedDistance}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedDistance: e.target.value }))}
                  placeholder="e.g. 1400"
                />
              </Field>
              <Field label="Priority">
                <FormSelect
                  value={form.priority}
                  onChange={(val) => setForm((f) => ({ ...f, priority: val }))}
                  options={PRIORITY_OPTIONS}
                />
              </Field>
            </>
          )}
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Trip"
        description={`Delete trip "${deleteTarget?.tripNumber}"? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  );
}
