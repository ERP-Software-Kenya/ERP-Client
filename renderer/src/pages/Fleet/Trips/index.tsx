import { useState } from 'react';
import { DataTable, type Column } from '../../../components/DataTable';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { ViewDrawer } from '../../../components/ViewDrawer';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FleetTrips, FleetVehicles, FleetDrivers, Customers } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import { TripStatusBadge } from '../index';
import type { FleetTrip, FleetTripStatus } from '../../../types';

const TRIP_STATUSES: FleetTripStatus[] = ['scheduled', 'in_transit', 'completed', 'cancelled', 'delayed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

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

export default function FleetTripsPage() {
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

  const { data: vehicles = [] } = FleetVehicles.useList();
  const { data: drivers  = [] } = FleetDrivers.useList();
  const { data: customersResult } = Customers.useSearch({ enabled: true });
  const customers = customersResult?.items ?? [];

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = (row: FleetTrip) => {
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
  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, body: { tripStatus: form.tripStatus, remarks: form.remarks || undefined } as Partial<FleetTrip> }, { onSuccess: closeDrawer });
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
                <select value={form.tripStatus} onChange={(e) => setForm((f) => ({ ...f, tripStatus: e.target.value as FleetTripStatus }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {TRIP_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Remarks">
                <Input value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Trip Number" required>
                <Input value={form.tripNumber} onChange={(e) => setForm((f) => ({ ...f, tripNumber: e.target.value }))} placeholder="e.g. TRIP-2024-001" required />
              </Field>
              <Field label="Vehicle" required>
                <select value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}{v.model ? ` — ${v.model}` : ''}</option>)}
                </select>
              </Field>
              <Field label="Driver" required>
                <select value={form.driverId} onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                  <option value="">Select driver…</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                </select>
              </Field>
              <Field label="Customer" required>
                {customers.length > 0 ? (
                  <select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                    <option value="">Select customer…</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}
                  </select>
                ) : (
                  <Input value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
                    placeholder="Paste customer UUID" required className="font-mono text-xs" />
                )}
              </Field>
              <Field label="Pickup Location" required>
                <Input value={form.pickupLocation} onChange={(e) => setForm((f) => ({ ...f, pickupLocation: e.target.value }))} placeholder="e.g. Mumbai Warehouse, Gate 3" required />
              </Field>
              <Field label="Drop Location" required>
                <Input value={form.dropLocation} onChange={(e) => setForm((f) => ({ ...f, dropLocation: e.target.value }))} placeholder="e.g. Delhi Distribution Center" required />
              </Field>
              <Field label="Start Date & Time" required>
                <Input type="datetime-local" value={form.startDatetime} onChange={(e) => setForm((f) => ({ ...f, startDatetime: e.target.value }))} required />
              </Field>
              <Field label="Estimated Distance (km)">
                <Input type="number" min="0" step="0.1" value={form.estimatedDistance} onChange={(e) => setForm((f) => ({ ...f, estimatedDistance: e.target.value }))} placeholder="e.g. 1400" />
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
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
