import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FormSelect } from '../../../components/FormSelect';
import { FleetMaintenanceApi, FleetVehicles, MaintenanceTypes } from '../../../api';
import type { FleetMaintenance } from '../../../types';

const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));

interface FormState {
  vehicleId: string;
  maintenanceTypeId: string;
  serviceCenter: string;
  cost: string;
  serviceDate: string;
  status: string;
}

const EMPTY: FormState = {
  vehicleId: '', maintenanceTypeId: '', serviceCenter: '', cost: '', serviceDate: '', status: 'pending',
};

export default function FleetMaintenancePage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState<FleetMaintenance[]>([]);

  const createMutation = FleetMaintenanceApi.useCreate();
  const { data: vehicles = [], isLoading: vehiclesLoading } = FleetVehicles.useList();
  const { data: maintenanceTypes = [], isLoading: typesLoading } = MaintenanceTypes.useList();

  const vehicleOptions         = vehicles.map((v) => ({ value: v.id, label: v.vehicleNumber + (v.model ? ` — ${v.model}` : '') }));
  const maintenanceTypeOptions = maintenanceTypes.map((mt) => ({ value: mt.id, label: mt.name }));

  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.vehicleId || !form.maintenanceTypeId || !form.serviceCenter.trim() || !form.cost || !form.serviceDate) return;
    createMutation.mutate(
      {
        vehicleId:         form.vehicleId,
        maintenanceTypeId: form.maintenanceTypeId,
        serviceCenter:     form.serviceCenter.trim(),
        cost:              parseFloat(form.cost),
        serviceDate:       form.serviceDate,
        status:            form.status || undefined,
      } as Partial<FleetMaintenance>,
      {
        onSuccess: (result) => {
          setSubmitted((prev) => [result as FleetMaintenance, ...prev]);
          setForm(EMPTY);
          closeDrawer();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
            Maintenance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Log vehicle maintenance records</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="gap-2">
          <Wrench size={16} /> Log Maintenance
        </Button>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-600">
        The maintenance API supports create only. Records submitted this session are shown below.
      </div>

      {submitted.length > 0 ? (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">This Session</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Vehicle ID</th>
                  <th className="px-4 py-2 text-left">Service Center</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submitted.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-mono text-xs text-primary">{rec.id}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{rec.vehicleId}</td>
                    <td className="px-4 py-2">{rec.serviceCenter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <Wrench size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">No maintenance records this session.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDrawerOpen(true)}>Log Maintenance</Button>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Log Maintenance"
        footer={
          <>
            <Button type="submit" form="maintenance-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save Record'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Vehicle" required>
            <FormSelect
              value={form.vehicleId}
              onChange={(val) => setForm((f) => ({ ...f, vehicleId: val }))}
              options={vehicleOptions}
              placeholder="Select vehicle…"
              loading={vehiclesLoading}
            />
          </Field>
          <Field label="Maintenance Type" required>
            <FormSelect
              value={form.maintenanceTypeId}
              onChange={(val) => setForm((f) => ({ ...f, maintenanceTypeId: val }))}
              options={maintenanceTypeOptions}
              placeholder="Select maintenance type…"
              loading={typesLoading}
            />
          </Field>
          <Field label="Service Center" required>
            <Input
              value={form.serviceCenter}
              onChange={(e) => setForm((f) => ({ ...f, serviceCenter: e.target.value }))}
              placeholder="e.g. Tata Authorised Service"
              required
            />
          </Field>
          <Field label="Cost (₹)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              placeholder="e.g. 5000"
              required
            />
          </Field>
          <Field label="Service Date" required>
            <Input
              type="date"
              value={form.serviceDate}
              onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))}
              required
            />
          </Field>
          <Field label="Status">
            <FormSelect
              value={form.status}
              onChange={(val) => setForm((f) => ({ ...f, status: val }))}
              options={STATUS_OPTIONS}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
