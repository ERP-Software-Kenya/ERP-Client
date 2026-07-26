import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Inventory as InventoryApi, Products as ProductsApi, Stores as StoresApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { InventoryItem } from '../types';

const STATUS_OPTIONS = ['active', 'inactive'];

interface CreateFormState {
  product_id: string;
  store_id: string;
  quantity: string;
  min_quantity: string;
  unit: string;
  status: string;
}

interface EditFormState {
  min_quantity: string;
  status: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  product_id: '',
  store_id: '',
  quantity: '',
  min_quantity: '',
  unit: '',
  status: 'active',
};

export default function Inventory() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = useState<EditFormState>({ min_quantity: '', status: 'active' });
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    InventoryApi,
    'inventory',
    'Inventory item',
  );

  const openCreate = () => {
    setEditing(null);
    setCreateForm(EMPTY_CREATE_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: InventoryItem) => {
    setEditing(row);
    setEditForm({
      min_quantity: row.min_quantity != null ? String(row.min_quantity) : '',
      status: row.status ?? 'active',
    });
    setDialogOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<InventoryItem> = {
      product_id: createForm.product_id || undefined,
      store_id: createForm.store_id || undefined,
      quantity: createForm.quantity ? Number(createForm.quantity) : undefined,
      min_quantity: createForm.min_quantity ? Number(createForm.min_quantity) : undefined,
      unit: createForm.unit || undefined,
      status: createForm.status,
    };
    createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const body: Partial<InventoryItem> = {
      min_quantity: editForm.min_quantity ? Number(editForm.min_quantity) : undefined,
      status: editForm.status,
    };
    updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
  };

  // Live-tested 2026-07-26 directly against the deployed API: GET /inventory
  // and /inventory/list both return only `{id, name?}` per row — product_id/
  // store_id/quantity/min_quantity/status never round-trip today (see
  // docs/core-apis-fixes.md #11). Showing columns for fields the API can't
  // return would silently render blanks that look like real "no data" rather
  // than a backend limitation, so only the fields that actually exist are shown.
  const columns: Column<InventoryItem>[] = [
    { key: 'id', label: 'ID', render: (row) => row.id.slice(0, 8) },
    { key: 'name', label: 'Name', render: (row) => row.name || '(no name — API does not return product/store/quantity fields)' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Currently blocked — live-tested 2026-07-26: the create/update DTOs only expose `name`, and
        `POST /inventory` 500s on every call (see docs/core-apis-fixes.md #11). List/search do work, but
        only return `id`/`name` — product, store, quantity, and reorder level aren't reachable via the
        API at all today, despite likely existing in the database.
      </div>
      <ERPDataTable
        title="Inventory Management"
        description="Monitor stock balances across locations. Quantity changes go through Stock Movements (Phase 4)."
        queryKey="inventory"
        columns={columns}
        fetchData={(params) => InventoryApi.search(params)}
        searchPlaceholder="Search inventory…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      {!editing && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Balance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                Submitting is disabled — this endpoint currently fails server-side for every request
                (live-tested 2026-07-26, see docs/core-apis-fixes.md #11).
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <ResourceSelect
                  queryKey="products"
                  fetchList={() => ProductsApi.list()}
                  getLabel={(p) => p.name || p.sku || p.id}
                  value={createForm.product_id}
                  onValueChange={(v) => setCreateForm({ ...createForm, product_id: v })}
                  placeholder="Select product…"
                />
              </div>
              <div className="space-y-2">
                <Label>Store</Label>
                <ResourceSelect
                  queryKey="stores"
                  fetchList={() => StoresApi.list()}
                  getLabel={(s) => s.name}
                  value={createForm.store_id}
                  onValueChange={(v) => setCreateForm({ ...createForm, store_id: v })}
                  placeholder="Select store…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-quantity">Initial Quantity</Label>
                <Input
                  id="inv-quantity"
                  type="number"
                  min="0"
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-min-quantity">Reorder Level (min quantity)</Label>
                <Input
                  id="inv-min-quantity"
                  type="number"
                  min="0"
                  value={createForm.min_quantity}
                  onChange={(e) => setCreateForm({ ...createForm, min_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-unit">Unit</Label>
                <Input
                  id="inv-unit"
                  value={createForm.unit}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={createForm.status} onValueChange={(v) => setCreateForm({ ...createForm, status: v })}>
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
                <Button type="submit" disabled>
                  {isSaving ? 'Saving…' : 'Save (blocked — see notice above)'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {editing && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory Balance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
                Submitting is disabled — the update DTO shares the same `name`-only scaffold bug as
                create (see docs/core-apis-fixes.md #11), and quantity isn't returned by the API at all
                (see the notice above the table), so there's nothing reliable to edit here yet.
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-edit-min-quantity">Reorder Level (min quantity)</Label>
                <Input
                  id="inv-edit-min-quantity"
                  type="number"
                  min="0"
                  value={editForm.min_quantity}
                  onChange={(e) => setEditForm({ ...editForm, min_quantity: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
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
                <Button type="submit" disabled>
                  {isSaving ? 'Saving…' : 'Save (blocked — see notice above)'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Inventory Balance"
        description="Delete this inventory balance record? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
