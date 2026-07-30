import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PaymentTransactions as PaymentTransactionsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { PaymentTransaction } from '../types';

interface FormState {
  referenceId: string;
  referenceType: string;
  type: string;
  method: string;
  amount: string;
  status: string;
}

const EMPTY_FORM: FormState = { referenceId: '', referenceType: '', type: '', method: '', amount: '', status: '' };

export default function PaymentTransactions() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentTransaction | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PaymentTransaction | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    PaymentTransactionsApi,
    'payment-transactions',
    'Payment',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: PaymentTransaction) => {
    setEditing(row);
    setForm({
      referenceId: row.referenceId ?? '',
      referenceType: row.referenceType ?? '',
      type: row.type ?? '',
      method: row.method ?? '',
      amount: row.amount != null ? String(row.amount) : '',
      status: row.status ?? '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<PaymentTransaction> = {
      referenceId: form.referenceId || undefined,
      referenceType: form.referenceType || undefined,
      type: form.type || undefined,
      method: form.method || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const columns: Column<PaymentTransaction>[] = [
    { key: 'referenceType', label: 'Linked To' },
    { key: 'method', label: 'Method' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => `$${Number(row.amount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Currently blocked — recording a payment fails on the backend (domain model uses `orgId`, the
        database column is `organizationId`, see docs/core-apis-fixes.md #0d). Payments normally get
        recorded from a Bill's detail view, linked via referenceType/referenceId.
      </div>
      <ERPDataTable
        title="Payment Transactions"
        description="All recorded payments across bills/invoices."
        queryKey="payment-transactions"
        columns={columns}
        fetchData={(params) => PaymentTransactionsApi.search(params)}
        searchPlaceholder="Search payments…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Payment' : 'Add Payment'}
        footer={
          <>
            <Button type="submit" form="payment-transaction-form" disabled>
              {isSaving ? 'Saving…' : 'Save (blocked — see notice above)'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="payment-transaction-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — this endpoint currently fails server-side for every request.
          </div>
          <Field label="Linked To (type)">
            <Input
              placeholder="e.g. bill"
              value={form.referenceType}
              onChange={(e) => setForm({ ...form, referenceType: e.target.value })}
            />
          </Field>
          <Field label="Linked To (ID)">
            <Input
              value={form.referenceId}
              onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
            />
          </Field>
          <Field label="Method">
            <Input
              placeholder="e.g. cash, card, bank_transfer"
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Input
              placeholder="e.g. completed"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Payment"
        description="Delete this payment record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
