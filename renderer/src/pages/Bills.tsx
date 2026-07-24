import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Bills as BillsApi, PurchaseOrders as PurchaseOrdersApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Bill } from '../types';

interface FormState {
  purchase_order_id: string;
  amount: string;
  due_date: string;
  status: string;
}

const EMPTY_FORM: FormState = { purchase_order_id: '', amount: '', due_date: '', status: '' };

export default function Bills() {
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
      purchase_order_id: row.purchase_order_id ?? '',
      amount: row.amount != null ? String(row.amount) : '',
      due_date: row.due_date ? row.due_date.slice(0, 10) : '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Bill> = {
      purchase_order_id: form.purchase_order_id || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      due_date: form.due_date || undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<Bill>[] = [
    { key: 'purchase_order_id', label: 'Purchase Order' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => `$${Number(row.amount || 0).toFixed(2)}`,
    },
    { key: 'due_date', label: 'Due Date' },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Bills"
        description="Track bills and payment obligations. A purchase order link is optional — direct entry is supported."
        queryKey="bills"
        columns={columns}
        fetchData={(params) => BillsApi.search(params)}
        searchPlaceholder="Search bills…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Purchase Order (optional)</Label>
              <ResourceSelect
                queryKey="purchase-orders"
                fetchList={() => PurchaseOrdersApi.list()}
                getLabel={(po) => `PO ${po.id.slice(0, 8)} — ${po.status ?? 'unknown'}`}
                value={form.purchase_order_id}
                onValueChange={(v) => setForm({ ...form, purchase_order_id: v })}
                placeholder="No linked purchase order"
                allowNone
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
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bill-due-date">Due Date</Label>
              <Input
                id="bill-due-date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              {/* TODO: verify against live API — Bill's real status enum isn't confirmed; free text
                  avoids guessing an unverified set of values. */}
              <Label htmlFor="bill-status">Status</Label>
              <Input
                id="bill-status"
                placeholder="e.g. unpaid"
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
