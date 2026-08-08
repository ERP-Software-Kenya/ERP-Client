import { useState } from 'react';
import { Wrench, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FleetMaintenanceApi, FleetVehicles } from '../../../api';
import type { FleetMaintenance } from '../../../types';
import { toast } from 'sonner';

const SEED_SQL = `-- Run once to seed maintenance types
INSERT INTO core.maintenance_types (name) VALUES
  ('Oil Change'), ('Tire Rotation'), ('Brake Service'), ('Engine Tune-up'),
  ('Transmission Service'), ('Battery Replacement'), ('Air Filter'), ('General Inspection')
ON CONFLICT DO NOTHING;

-- Fetch UUIDs:
SELECT id, name FROM core.maintenance_types;`;

const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

interface FormState {
  vehicleId: string;
  maintenanceTypeId: string;
  serviceCenter: string;
  cost: string;
  serviceDate: string;
  status: string;
}

const EMPTY: FormState = { vehicleId: '', maintenanceTypeId: '', serviceCenter: '', cost: '', serviceDate: '', status: 'pending' };

function SeedPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-amber-600 font-medium">
        <span>Maintenance Types must be seeded — click for SQL</span>
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

export default function FleetMaintenancePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState<FleetMaintenance[]>([]);

  const createMutation = FleetMaintenanceApi.useCreate();
  const { data: vehicles = [] } = FleetVehicles.useList();

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.vehicleId || !form.maintenanceTypeId.trim() || !form.serviceCenter.trim() || !form.cost || !form.serviceDate) return;
    createMutation.mutate(
      { vehicleId: form.vehicleId, maintenanceTypeId: form.maintenanceTypeId.trim(), serviceCenter: form.serviceCenter.trim(), cost: parseFloat(form.cost), serviceDate: form.serviceDate, status: form.status || undefined } as Partial<FleetMaintenance>,
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

      <SeedPanel />

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
            <select value={form.vehicleId} onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}{v.model ? ` — ${v.model}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Maintenance Type ID (UUID)" required hint="From core.maintenance_types — see SQL above">
            <Input value={form.maintenanceTypeId} onChange={(e) => setForm((f) => ({ ...f, maintenanceTypeId: e.target.value }))}
              placeholder="Paste UUID" required className="font-mono text-xs" />
          </Field>
          <Field label="Service Center" required>
            <Input value={form.serviceCenter} onChange={(e) => setForm((f) => ({ ...f, serviceCenter: e.target.value }))} placeholder="e.g. Tata Authorised Service" required />
          </Field>
          <Field label="Cost (₹)" required>
            <Input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} placeholder="e.g. 5000" required />
          </Field>
          <Field label="Service Date" required>
            <Input type="date" value={form.serviceDate} onChange={(e) => setForm((f) => ({ ...f, serviceDate: e.target.value }))} required />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
