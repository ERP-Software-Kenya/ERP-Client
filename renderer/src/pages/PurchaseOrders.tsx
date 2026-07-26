import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PurchaseOrders as PurchaseOrdersApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { PurchaseOrder } from '../types';

interface FormState {
  name: string;
}

const EMPTY_FORM: FormState = { name: '' };

export default function PurchaseOrders() {
  const navigate = useNavigate();
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
    setForm({ name: row.name ?? '' });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<PurchaseOrder> = { name: form.name || undefined };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'name', label: 'Name', render: (row) => row.name || '(unnamed)' },
    { key: 'id', label: 'ID', render: (row) => row.id.slice(0, 8) },
    { key: 'created_at', label: 'Created' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Currently blocked end-to-end — live-tested 2026-07-26: both browsing (list/search 500s, see
        docs/core-apis-fixes.md #1) and creating (500s even for just "Name", see #0) fail server-side.
        Supplier, store, status, total, and order date exist in the database but aren't exposed by the
        API at all. Line items and Bills are managed from a purchase order's detail view.
      </div>
      <ERPDataTable
        title="Purchase Orders"
        description="Manage purchase orders. Open a row to view/add line items and linked bills."
        queryKey="purchase-orders"
        columns={columns}
        fetchData={(params) => PurchaseOrdersApi.search(params)}
        searchPlaceholder="Search purchase orders…"
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => navigate(`/purchase-orders/${row.id}`)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Purchase Order' : 'Add Purchase Order'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — this endpoint currently fails server-side for every request (live-tested 2026-07-26, see docs/core-apis-fixes.md #0).
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-name">Name</Label>
              <Input
                id="po-name"
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
                autoFocus
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
