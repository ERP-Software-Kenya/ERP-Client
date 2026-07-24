import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ItemReturns as ItemReturnsApi, Stores as StoresApi, Suppliers as SuppliersApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { ItemReturn } from '../types';

const RETURN_TYPE_OPTIONS = ['sales', 'purchase'] as const;

interface FormState {
  returnType: string;
  storeId: string;
  supplierId: string;
  orderId: string;
  totalAmount: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  returnType: 'purchase',
  storeId: '',
  supplierId: '',
  orderId: '',
  totalAmount: '',
  status: '',
};

export default function ItemReturns() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemReturn | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ItemReturn | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    ItemReturnsApi,
    'item-returns',
    'Item Return',
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: ItemReturn) => {
    setEditing(row);
    setForm({
      returnType: row.returnType ?? 'purchase',
      storeId: row.storeId ?? '',
      supplierId: row.supplierId ?? '',
      orderId: row.orderId ?? '',
      totalAmount: row.total_amount != null ? String(row.total_amount) : '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<ItemReturn> = {
      returnType: form.returnType as ItemReturn['returnType'],
      storeId: form.storeId || undefined,
      supplierId: form.supplierId || undefined,
      orderId: form.orderId || undefined,
      total_amount: form.totalAmount ? Number(form.totalAmount) : undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<ItemReturn>[] = [
    { key: 'return_number', label: 'Return #' },
    { key: 'returnType', label: 'Type' },
    {
      key: 'total_amount',
      label: 'Total',
      render: (row) => `$${Number(row.total_amount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Item Returns"
        description="Sales and purchase returns share this resource — select the type to distinguish them."
        queryKey="item-returns"
        columns={columns}
        fetchData={(params) => ItemReturnsApi.search(params)}
        searchPlaceholder="Search returns…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item Return' : 'Add Item Return'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Return Type</Label>
              <Select value={form.returnType} onValueChange={(v) => setForm({ ...form, returnType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.storeId}
                onValueChange={(v) => setForm({ ...form, storeId: v })}
                placeholder="Select store…"
                allowNone
              />
            </div>
            {form.returnType === 'purchase' && (
              <div className="space-y-2">
                <Label>Supplier</Label>
                <ResourceSelect
                  queryKey="suppliers"
                  fetchList={() => SuppliersApi.list()}
                  getLabel={(s) => s.name}
                  value={form.supplierId}
                  onValueChange={(v) => setForm({ ...form, supplierId: v })}
                  placeholder="Select supplier…"
                  allowNone
                />
              </div>
            )}
            <div className="space-y-2">
              {/* TODO: verify against live API — Phase 2 spec flags this may be PO-specific wording,
                  unclear if it accepts a purchase order id for returnType=purchase. */}
              <Label htmlFor="ret-order-id">Order / Purchase Order ID (optional)</Label>
              <Input
                id="ret-order-id"
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-total">Total Amount</Label>
              <Input
                id="ret-total"
                type="number"
                step="0.01"
                min="0"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret-status">Status</Label>
              <Input
                id="ret-status"
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
        title="Delete Item Return"
        description="Delete this return record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
