import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Bills as BillsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Bill } from '../types';

interface FormState {
  billNumber: string;
  amount: string;
  status: string;
}

const EMPTY_FORM: FormState = { billNumber: '', amount: '', status: '' };

export default function Bills() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(BillsApi, 'bills', 'Bill');

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Bill) => {
    setEditing(row);
    setForm({
      billNumber: row.billNumber ?? '',
      amount: row.amount != null ? String(row.amount) : '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Bill> = {
      billNumber: form.billNumber || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Bill>[] = [
    { key: 'billNumber', label: 'Bill #' },
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
        Currently blocked end-to-end — live-tested 2026-07-26: browsing (list/search 500s, see
        docs/core-apis-fixes.md #1) and creating/updating (field mismatch between the API and the
        database, see #0c) both fail server-side. There's also no field linking a bill to a Purchase
        Order today.
      </div>
      <ERPDataTable
        title="Bills"
        description="Track bills and payment obligations."
        queryKey="bills"
        columns={columns}
        fetchData={(params) => BillsApi.search(params)}
        searchPlaceholder="Search bills…"
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => navigate(`/bills/${row.id}`)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — this endpoint currently fails server-side for every request.
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-number">Bill Number</Label>
              <Input
                id="bill-number"
                value={form.billNumber}
                onChange={(e) => setForm({ ...form, billNumber: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-amount">Amount</Label>
              <Input
                id="bill-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-status">Status</Label>
              <Input
                id="bill-status"
                placeholder="e.g. UNPAID"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled>
                {isSaving ? 'Saving…' : 'Save (blocked — see notice above)'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Bill"
        description="Delete this bill? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
