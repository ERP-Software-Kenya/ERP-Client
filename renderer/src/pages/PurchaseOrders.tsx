import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PurchaseOrders as PurchaseOrdersApi, Suppliers as SuppliersApi, Stores as StoresApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { PurchaseOrder } from '../types';

// TODO: verify against live API — guessed from the dead legacy PurchaseOrdersView.tsx, not confirmed
// against a real POST /api/v1/purchase-orders response.
const STATUS_OPTIONS = ['pending', 'approved', 'received', 'cancelled'];

interface FormState {
  supplier_id: string;
  store_id: string;
  total_amount: string;
  status: string;
  ordered_at: string;
}

const EMPTY_FORM: FormState = { supplier_id: '', store_id: '', total_amount: '', status: 'pending', ordered_at: '' };

export default function PurchaseOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    PurchaseOrdersApi,
    'purchase-orders',
    'Purchase Order',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: PurchaseOrder) => {
    setEditing(row);
    setForm({
      supplier_id: row.supplier_id ?? '',
      store_id: row.store_id ?? '',
      total_amount: row.total_amount != null ? String(row.total_amount) : '',
      status: row.status ?? 'pending',
      ordered_at: row.ordered_at ? row.ordered_at.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<PurchaseOrder> = {
      supplier_id: form.supplier_id || undefined,
      store_id: form.store_id || undefined,
      total_amount: form.total_amount ? Number(form.total_amount) : undefined,
      status: form.status,
      ordered_at: form.ordered_at || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'supplier_id', label: 'Supplier' },
    { key: 'store_id', label: 'Store' },
    {
      key: 'total_amount',
      label: 'Total',
      render: (row) => `$${Number(row.total_amount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
    { key: 'ordered_at', label: 'Ordered At' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Purchase Orders"
        description="Manage purchase orders. Line items are added from a purchase order's detail view (Phase 2)."
        queryKey="purchase-orders"
        columns={columns}
        fetchData={(params) => PurchaseOrdersApi.search(params)}
        searchPlaceholder="Search purchase orders…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Purchase Order' : 'Add Purchase Order'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <ResourceSelect
                queryKey="suppliers"
                fetchList={() => SuppliersApi.list()}
                getLabel={(s) => s.name}
                value={form.supplier_id}
                onValueChange={(v) => setForm({ ...form, supplier_id: v })}
                placeholder="Select supplier…"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.store_id}
                onValueChange={(v) => setForm({ ...form, store_id: v })}
                placeholder="Select store…"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-total">Total Amount</Label>
              <Input
                id="po-total"
                type="number"
                step="0.01"
                min="0"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-ordered-at">Ordered At</Label>
              <Input
                id="po-ordered-at"
                type="date"
                value={form.ordered_at}
                onChange={(e) => setForm({ ...form, ordered_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        title="Delete Purchase Order"
        description="Delete this purchase order? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
