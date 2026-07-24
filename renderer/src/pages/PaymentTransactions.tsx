import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PaymentTransactions as PaymentTransactionsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { PaymentTransaction } from '../types';

interface FormState {
  reference: string;
  type: string;
  amount: string;
  status: string;
}

const EMPTY_FORM: FormState = { reference: '', type: '', amount: '', status: '' };

export default function PaymentTransactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
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
    setDialogOpen(true);
  };

  const openEdit = (row: PaymentTransaction) => {
    setEditing(row);
    setForm({
      reference: row.reference ?? '',
      type: row.type ?? '',
      amount: row.amount != null ? String(row.amount) : '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<PaymentTransaction> = {
      reference: form.reference || undefined,
      type: form.type || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<PaymentTransaction>[] = [
    { key: 'reference', label: 'Reference' },
    { key: 'type', label: 'Type' },
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
      <ERPDataTable
        title="Payment Transactions"
        description="Record payments. Linking a payment to a specific bill/invoice is Phase 2/3 (real link field names unverified — see spec)."
        queryKey="payment-transactions"
        columns={columns}
        fetchData={(params) => PaymentTransactionsApi.search(params)}
        searchPlaceholder="Search payments…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-reference">Reference</Label>
              <Input
                id="pay-reference"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              {/* TODO: verify against live API — real OpenAPI shape shows orgId/referenceId/referenceType/method,
                  richer than this. Confirm before Phase 2 needs to link payments to a specific Bill. */}
              <Label htmlFor="pay-type">Type</Label>
              <Input
                id="pay-type"
                placeholder="e.g. cash, card, bank_transfer"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-status">Status</Label>
              <Input
                id="pay-status"
                placeholder="e.g. completed"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
