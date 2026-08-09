import { useState } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FilterDropdown } from '../../components/FilterDropdown';
import { ResourceSelect } from '../../components/ResourceSelect';
import { Expenses, ExpensesApi, Locations, Organizations } from '../../api';
import type { Expense, EExpenseStatus } from '../../types';

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_BADGE: Record<EExpenseStatus, { label: string; class: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  class: 'bg-amber-500/10 text-amber-600',  icon: <Clock size={11} /> },
  approved: { label: 'Approved', class: 'bg-green-500/10 text-green-600',  icon: <CheckCircle2 size={11} /> },
  rejected: { label: 'Rejected', class: 'bg-red-500/10 text-red-500',     icon: <XCircle size={11} /> },
};

interface FormState {
  organizationId: string;
  locationId: string;
  category: string;
  amount: string;
  expenseDate: string;
  description: string;
  submittedBy: string;
}

const EMPTY: FormState = {
  organizationId: '',
  locationId: '',
  category: '',
  amount: '',
  expenseDate: '',
  description: '',
  submittedBy: '',
};

export default function ExpensesPage(): React.JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [approveTarget, setApproveTarget] = useState<Expense | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null);

  const { data: expenses = [], isLoading, error, refetch } = ExpensesApi.useList(statusFilter || undefined);
  const createMutation = Expenses.useCreate();
  const updateStatus = ExpensesApi.useUpdateStatus();

  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.organizationId || !form.category || !form.amount || !form.expenseDate) return;
    createMutation.mutate(
      {
        organizationId: form.organizationId,
        locationId: form.locationId || undefined,
        category: form.category,
        amount: Number(form.amount),
        expenseDate: new Date(form.expenseDate).toISOString() as unknown as undefined,
        description: form.description || undefined,
        submittedBy: form.submittedBy || undefined,
      } as Partial<Expense>,
      {
        onSuccess: () => {
          void refetch();
          closeDrawer();
          setForm(EMPTY);
        },
      },
    );
  };

  const handleApprove = (): void => {
    if (!approveTarget) return;
    updateStatus.mutate(
      { id: approveTarget.id, status: 'approved' },
      { onSuccess: () => setApproveTarget(null) },
    );
  };

  const handleReject = (): void => {
    if (!rejectTarget) return;
    updateStatus.mutate(
      { id: rejectTarget.id, status: 'rejected' },
      { onSuccess: () => setRejectTarget(null) },
    );
  };

  return (
    <div className="space-y-4">
      <DataTable<Expense>
        title="Expenses"
        description="Manage organisation expenses and expense claim requests."
        toolbar={
          <FilterDropdown
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter || null}
            onChange={(v) => setStatusFilter(v ?? '')}
          />
        }
        columns={[
          {
            key: 'status',
            label: 'Status',
            render: (r) => {
              const st = (r.status ?? 'pending') as EExpenseStatus;
              const cfg = STATUS_BADGE[st] ?? STATUS_BADGE.pending;
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.class}`}>
                  {cfg.icon} {cfg.label}
                </span>
              );
            },
          },
          {
            key: 'category',
            label: 'Category',
            render: (r) => <span className="font-medium">{r.category ?? '—'}</span>,
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (r) =>
              r.amount != null
                ? <span className="font-semibold tabular-nums">₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                : <span className="text-muted-foreground">—</span>,
          },
          {
            key: 'submittedBy',
            label: 'Submitted By',
            render: (r) => r.submittedBy ?? <span className="text-muted-foreground">—</span>,
          },
          {
            key: 'expenseDate',
            label: 'Date',
            render: (r) => (r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : '—'),
          },
          {
            key: 'description',
            label: 'Description',
            render: (r) => (
              r.description
                ? <span className="text-muted-foreground text-xs">{r.description}</span>
                : <span className="text-muted-foreground">—</span>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (r) => {
              const st = r.status ?? 'pending';
              if (st !== 'pending') return null;
              return (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-600 hover:text-green-700 hover:bg-green-500/10 h-7 px-2"
                    onClick={() => setApproveTarget(r)}
                  >
                    <CheckCircle2 size={13} className="mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 px-2"
                    onClick={() => setRejectTarget(r)}
                  >
                    <XCircle size={13} className="mr-1" /> Reject
                  </Button>
                </div>
              );
            },
          },
        ]}
        rows={expenses}
        total={expenses.length}
        page={page}
        loading={isLoading}
        error={error ? 'Failed to load expenses' : null}
        onPageChange={setPage}
        hideSearch
        onRefetch={() => void refetch()}
        onAdd={() => setDrawerOpen(true)}
        addLabel="Submit Claim"
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Submit Expense Claim"
        footer={
          <>
            <Button
              type="submit"
              form="expense-form"
              disabled={createMutation.isPending || !form.organizationId || !form.category || !form.amount || !form.expenseDate}
            >
              {createMutation.isPending ? 'Submitting…' : 'Submit Claim'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Organisation" required>
            <ResourceSelect
              resource={Organizations}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm((f) => ({ ...f, organizationId: v }))}
              placeholder="Select organisation…"
            />
          </Field>
          <Field label="Location (optional)">
            <ResourceSelect
              resource={Locations}
              getLabel={(s) => s.name}
              value={form.locationId}
              onValueChange={(v) => setForm((f) => ({ ...f, locationId: v }))}
              placeholder="Select location…"
              allowNone
            />
          </Field>
          <Field label="Category" required>
            <Input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Travel, Meals, Office Supplies"
              required
            />
          </Field>
          <Field label="Amount (₹)" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
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
              placeholder="Optional notes or purpose"
            />
          </Field>
          <Field label="Submitted By">
            <Input
              value={form.submittedBy}
              onChange={(e) => setForm((f) => ({ ...f, submittedBy: e.target.value }))}
              placeholder="Name or employee ID (optional)"
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve Expense"
        description={`Approve this ${approveTarget?.category ?? 'expense'} claim of ₹${approveTarget?.amount ?? 0}?`}
        confirmLabel="Approve"
        isPending={updateStatus.isPending}
        onConfirm={handleApprove}
      />

      <ConfirmDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject Expense"
        description={`Reject this ${rejectTarget?.category ?? 'expense'} claim of ₹${rejectTarget?.amount ?? 0}?`}
        confirmLabel="Reject"
        isPending={updateStatus.isPending}
        onConfirm={handleReject}
      />
    </div>
  );
}
