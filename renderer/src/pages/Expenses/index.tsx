import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Eye, Banknote } from 'lucide-react';
import { DataTable } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FilterDropdown } from '../../components/FilterDropdown';
import { ResourceSelect } from '../../components/ResourceSelect';
import { Expenses, ExpensesApi, Locations } from '../../api';
import { loadErrorMessage } from '../../lib/api-error';
import { useSession } from '../../context/SessionContext';
import type { Expense, EExpenseStatus } from '../../types';

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Settled', value: 'settled' },
];

const STATUS_BADGE: Record<EExpenseStatus, { label: string; class: string; icon: React.ReactNode }> = {
  pending:      { label: 'Pending',      class: 'bg-amber-500/10 text-amber-600',   icon: <Clock size={11} /> },
  under_review: { label: 'Under Review', class: 'bg-blue-900/40 text-blue-300',     icon: <Eye size={11} /> },
  approved:     { label: 'Approved',     class: 'bg-green-500/10 text-green-600',   icon: <CheckCircle2 size={11} /> },
  rejected:     { label: 'Rejected',     class: 'bg-red-500/10 text-red-500',       icon: <XCircle size={11} /> },
  settled:      { label: 'Settled',      class: 'bg-purple-900/40 text-purple-300', icon: <Banknote size={11} /> },
};

interface FormState {
  locationId: string;
  category: string;
  amount: string;
  expenseDate: string;
  description: string;
  receiptFile: File | null;
}

const EMPTY: FormState = {
  locationId: '',
  category: '',
  amount: '',
  expenseDate: '',
  description: '',
  receiptFile: null,
};

export default function ExpensesPage(): React.JSX.Element {
  const { isAdmin, user, organization } = useSession();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const [approveTarget, setApproveTarget] = useState<Expense | null>(null);
  const [rejectTarget, setRejectTarget]   = useState<Expense | null>(null);
  const [reviewTarget, setReviewTarget]   = useState<Expense | null>(null);
  const [settleTarget, setSettleTarget]   = useState<Expense | null>(null);
  const [actionComment, setActionComment] = useState('');

  const { data: expenses = [], isLoading, error, refetch } = ExpensesApi.useList(statusFilter || undefined);
  const createMutation = Expenses.useCreate();
  const updateStatus   = ExpensesApi.useUpdateStatus();
  const uploadReceipt  = ExpensesApi.useUploadReceipt();

  const closeDrawer = (): void => setDrawerOpen(false);

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.category || !form.amount || !form.expenseDate) return;
    createMutation.mutate(
      {
        locationId:  form.locationId || undefined,
        category:    form.category,
        amount:      Number(form.amount),
        expenseDate: new Date(form.expenseDate).toISOString() as unknown as undefined,
        description: form.description || undefined,
      } as Partial<Expense>,
      {
        onSuccess: (newExpense) => {
          if (form.receiptFile && newExpense?.id) {
            uploadReceipt.mutate({ id: newExpense.id, file: form.receiptFile });
          }
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
      { id: rejectTarget.id, status: 'rejected', comment: actionComment },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setActionComment('');
        },
      },
    );
  };

  const handleReview = (): void => {
    if (!reviewTarget) return;
    updateStatus.mutate(
      { id: reviewTarget.id, status: 'under_review', comment: actionComment },
      {
        onSuccess: () => {
          setReviewTarget(null);
          setActionComment('');
        },
      },
    );
  };

  const handleSettle = (): void => {
    if (!settleTarget) return;
    updateStatus.mutate(
      { id: settleTarget.id, status: 'settled' },
      { onSuccess: () => setSettleTarget(null) },
    );
  };

  const commentTextarea = (
    <textarea
      value={actionComment}
      onChange={(e) => setActionComment(e.target.value)}
      placeholder="Add a comment (required)…"
      rows={3}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none mt-1"
    />
  );

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
            key: 'submittedByName',
            label: 'Submitted By',
            render: (r) => r.submittedByName ?? <span className="text-muted-foreground">—</span>,
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
          ...(isAdmin
            ? [
                {
                  key: 'adminComment' as keyof Expense,
                  label: 'Admin Comment',
                  render: (r: Expense) =>
                    r.adminComment
                      ? (
                        <span
                          className="text-muted-foreground text-xs"
                          title={r.adminComment}
                        >
                          {r.adminComment.length > 40 ? `${r.adminComment.slice(0, 40)}…` : r.adminComment}
                        </span>
                      )
                      : <span className="text-muted-foreground">—</span>,
                },
                {
                  key: 'actions' as keyof Expense,
                  label: '',
                  render: (r: Expense) => {
                    const st = r.status ?? 'pending';
                    if (st === 'pending') {
                      return (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2"
                            onClick={() => { setReviewTarget(r); setActionComment(''); }}
                          >
                            <Eye size={13} className="mr-1" /> Review
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 px-2"
                            onClick={() => { setRejectTarget(r); setActionComment(''); }}
                          >
                            <XCircle size={13} className="mr-1" /> Reject
                          </Button>
                        </div>
                      );
                    }
                    if (st === 'under_review') {
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
                            onClick={() => { setRejectTarget(r); setActionComment(''); }}
                          >
                            <XCircle size={13} className="mr-1" /> Reject
                          </Button>
                        </div>
                      );
                    }
                    if (st === 'approved') {
                      return (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 px-2"
                          onClick={() => setSettleTarget(r)}
                        >
                          <Banknote size={13} className="mr-1" /> Mark Settled
                        </Button>
                      );
                    }
                    return null;
                  },
                },
              ]
            : []),
        ]}
        rows={expenses}
        total={expenses.length}
        page={page}
        loading={isLoading}
        error={error ? loadErrorMessage(error, 'expenses') : null}
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
              disabled={createMutation.isPending || !form.category || !form.amount || !form.expenseDate}
            >
              {createMutation.isPending ? 'Submitting…' : 'Submit Claim'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          {(user || organization) && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm space-y-0.5">
              {organization && (
                <p className="text-muted-foreground">
                  Organisation: <span className="font-medium text-foreground">{organization.name}</span>
                </p>
              )}
              {user && (
                <p className="text-muted-foreground">
                  Submitting as: <span className="font-medium text-foreground">{user.fullName}</span>
                </p>
              )}
            </div>
          )}
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
          <Field label="Receipt (optional)">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setForm((f) => ({ ...f, receiptFile: e.target.files?.[0] ?? null }))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>
        </form>
      </FormDrawer>

      {/* Approve — no comment required */}
      <ConfirmDialog
        open={approveTarget !== null}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve Expense"
        description={`Approve this ${approveTarget?.category ?? 'expense'} claim of ₹${approveTarget?.amount ?? 0}?`}
        confirmLabel="Approve"
        confirmVariant="default"
        isPending={updateStatus.isPending}
        onConfirm={handleApprove}
      />

      {/* Reject — comment required */}
      <ConfirmDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setActionComment('');
          }
        }}
        title="Reject Expense"
        description={`Reject this ${rejectTarget?.category ?? 'expense'} claim of ₹${rejectTarget?.amount ?? 0}?`}
        confirmLabel="Reject"
        confirmVariant="destructive"
        isPending={updateStatus.isPending}
        confirmDisabled={!actionComment.trim()}
        onConfirm={handleReject}
      >
        {commentTextarea}
      </ConfirmDialog>

      {/* Move to Under Review — comment required */}
      <ConfirmDialog
        open={reviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null);
            setActionComment('');
          }
        }}
        title="Move to Under Review"
        description={`Move this ${reviewTarget?.category ?? 'expense'} claim of ₹${reviewTarget?.amount ?? 0} to under review?`}
        confirmLabel="Move to Review"
        confirmVariant="default"
        isPending={updateStatus.isPending}
        confirmDisabled={!actionComment.trim()}
        onConfirm={handleReview}
      >
        {commentTextarea}
      </ConfirmDialog>

      {/* Mark Settled — no comment required */}
      <ConfirmDialog
        open={settleTarget !== null}
        onOpenChange={(open) => !open && setSettleTarget(null)}
        title="Mark as Settled"
        description={`Mark this ${settleTarget?.category ?? 'expense'} claim of ₹${settleTarget?.amount ?? 0} as settled?`}
        confirmLabel="Mark Settled"
        confirmVariant="default"
        isPending={updateStatus.isPending}
        onConfirm={handleSettle}
      />
    </div>
  );
}
