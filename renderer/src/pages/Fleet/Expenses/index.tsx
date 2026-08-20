import { useState } from 'react';
import { Fuel, Trash2 } from 'lucide-react';
import { FormDrawer, Field } from '../../../components/FormDrawer';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FormSelect } from '../../../components/FormSelect';
import { FleetExpensesApi, FleetVehicles, FleetTrips } from '../../../api';
import type { FleetExpense, FleetExpenseType } from '../../../types';

const EXPENSE_TYPES: FleetExpenseType[] = ['fuel', 'toll', 'parking', 'insurance', 'tax', 'washing', 'repair', 'other'];

const EXPENSE_TYPE_OPTIONS = EXPENSE_TYPES.map((t) => ({
  value: t,
  label: t.charAt(0).toUpperCase() + t.slice(1),
}));

const TYPE_BADGE: Record<FleetExpenseType, string> = {
  fuel:      'bg-blue-500/10 text-blue-500',
  toll:      'bg-purple-500/10 text-purple-500',
  parking:   'bg-gray-500/10 text-gray-400',
  insurance: 'bg-green-500/10 text-green-600',
  tax:       'bg-red-500/10 text-red-500',
  washing:   'bg-cyan-500/10 text-cyan-600',
  repair:    'bg-amber-500/10 text-amber-500',
  other:     'bg-muted text-muted-foreground',
};

interface FormState {
  vehicleId: string;
  expenseType: FleetExpenseType;
  amount: string;
  expenseDate: string;
  description: string;
  tripId: string;
}

const EMPTY: FormState = { vehicleId: '', expenseType: 'fuel', amount: '', expenseDate: '', description: '', tripId: '' };

export default function FleetExpensesPage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState<FleetExpense[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<FleetExpense | null>(null);

  const createMutation = FleetExpensesApi.useCreate();
  const deleteMutation = FleetExpensesApi.useDelete();
  const { data: vehicles = [], isLoading: vehiclesLoading } = FleetVehicles.useList();
  const { data: tripsResult }   = FleetTrips.useSearch({ limit: 100 });
  const trips = tripsResult?.items ?? [];

  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: v.vehicleNumber + (v.model ? ` — ${v.model}` : '') }));
  const tripOptions    = [
    { value: '', label: 'No linked trip' },
    ...trips.map((t) => ({ value: t.id, label: t.tripNumber })),
  ];

  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.vehicleId || !form.amount || !form.expenseDate) return;
    createMutation.mutate(
      {
        vehicleId:   form.vehicleId,
        expenseType: form.expenseType,
        amount:      parseFloat(form.amount),
        expenseDate: form.expenseDate,
        description: form.description.trim() || undefined,
        tripId:      form.tripId || undefined,
      } as Partial<FleetExpense>,
      {
        onSuccess: (result) => {
          setSubmitted((prev) => [result as FleetExpense, ...prev]);
          setForm(EMPTY);
          closeDrawer();
        },
      },
    );
  };

  const totalAmount = submitted.reduce((sum, exp) => sum + (exp.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-teal-500 bg-clip-text text-transparent">
            Vehicle Expenses
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track operational expenses per vehicle</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="gap-2">
          <Fuel size={16} /> Add Expense
        </Button>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-blue-600">
        Expenses API supports create, get-by-id, and delete. Records logged this session appear below.
      </div>

      {submitted.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm inline-flex flex-col">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session Total</p>
          <p className="text-2xl font-black text-foreground mt-1 tabular-nums">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {submitted.length > 0 ? (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">This Session</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submitted.map((exp) => (
                  <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${TYPE_BADGE[exp.expenseType as FleetExpenseType] ?? TYPE_BADGE.other}`}>
                        {exp.expenseType}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-semibold tabular-nums">
                      ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-[180px] truncate">{exp.description ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setDeleteTarget(exp)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <Fuel size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">No expenses logged this session.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDrawerOpen(true)}>Add Expense</Button>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Log Vehicle Expense"
        footer={
          <>
            <Button type="submit" form="expense-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save Expense'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Vehicle" required>
            <FormSelect
              value={form.vehicleId}
              onChange={(val) => setForm((f) => ({ ...f, vehicleId: val }))}
              options={vehicleOptions}
              placeholder="Select vehicle…"
              loading={vehiclesLoading}
            />
          </Field>
          <Field label="Expense Type" required>
            <FormSelect
              value={form.expenseType}
              onChange={(val) => setForm((f) => ({ ...f, expenseType: val as FleetExpenseType }))}
              options={EXPENSE_TYPE_OPTIONS}
            />
          </Field>
          <Field label="Amount (₹)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="e.g. 2500.00"
              required
            />
          </Field>
          <Field label="Expense Date" required>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
              required
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes"
            />
          </Field>
          <Field label="Trip (optional)">
            <FormSelect
              value={form.tripId}
              onChange={(val) => setForm((f) => ({ ...f, tripId: val }))}
              options={tripOptions}
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Expense"
        description={`Delete this ${deleteTarget?.expenseType ?? ''} expense of ₹${deleteTarget?.amount ?? 0}?`}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => { setSubmitted((prev) => prev.filter((ex) => ex.id !== deleteTarget.id)); setDeleteTarget(null); },
            });
          }
        }}
      />
    </div>
  );
}
