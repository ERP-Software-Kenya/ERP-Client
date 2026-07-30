import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResourceSelect } from '../components/ResourceSelect';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ItemReturn | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ItemReturn | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(
    ItemReturnsApi,
    'item-returns',
    'Item Return',
  );

  const closeDrawer = () => setDrawerOpen(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: ItemReturn) => {
    setEditing(row);
    setForm({
      returnType: row.returnType ?? 'purchase',
      storeId: row.storeId ?? '',
      supplierId: row.supplierId ?? '',
      orderId: row.orderId ?? '',
      totalAmount: row.totalAmount != null ? String(row.totalAmount) : '',
      status: row.status ?? '',
    });
    setDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<ItemReturn> = {
      returnType: form.returnType as ItemReturn['returnType'],
      storeId: form.storeId || undefined,
      supplierId: form.supplierId || undefined,
      // orderId is a real FK to Orders (sales) — never send it for a purchase return, it can't
      // reference a PurchaseOrder. See docs/core-apis-fixes.md #0e.
      orderId: form.returnType === 'sales' ? form.orderId || undefined : undefined,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      status: form.status || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      createMutation.mutate(body, { onSuccess: closeDrawer });
    }
  };

  const columns: Column<ItemReturn>[] = [
    { key: 'id', label: 'ID', render: (row) => row.id.slice(0, 8) },
    { key: 'returnType', label: 'Type' },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row) => `$${Number(row.totalAmount || 0).toFixed(2)}`,
    },
    { key: 'status', label: 'Status' },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Currently blocked end-to-end — live-tested 2026-07-26: both browsing (list/search 500s) and
        creating a return (500s with a generic server error, even though this resource's request shape
        is correct — unlike most others in this app) fail server-side. See docs/core-apis-fixes.md #0e
        and #1. This looks like a shared backend issue (likely the missing-auth-guard root cause, see
        #10), not something specific to this form.
      </div>
      <ERPDataTable
        title="Item Returns"
        description="Sales and purchase returns share this resource — select the type to distinguish them. Purchase returns link to a supplier; there's no way to reference the originating Purchase Order today."
        queryKey="item-returns"
        columns={columns}
        fetchData={(params) => ItemReturnsApi.search(params)}
        searchPlaceholder="Search returns…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Item Return' : 'Add Item Return'}
        footer={
          <>
            <Button type="submit" form="item-return-form" disabled>
              {isSaving ? 'Saving…' : 'Save (blocked — see notice above)'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="item-return-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — this endpoint currently fails server-side for every request.
          </div>
          <Field label="Return Type">
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
          </Field>
          <Field label="Store">
            <ResourceSelect
              queryKey="stores"
              fetchList={() => StoresApi.list()}
              getLabel={(s) => s.name}
              value={form.storeId}
              onValueChange={(v) => setForm({ ...form, storeId: v })}
              placeholder="Select store…"
              allowNone
            />
          </Field>
          {form.returnType === 'purchase' && (
            <Field label="Supplier">
              <ResourceSelect
                queryKey="suppliers"
                fetchList={() => SuppliersApi.list()}
                getLabel={(s) => s.name}
                value={form.supplierId}
                onValueChange={(v) => setForm({ ...form, supplierId: v })}
                placeholder="Select supplier…"
                allowNone
              />
            </Field>
          )}
          {form.returnType === 'sales' && (
            <Field label="Order ID (optional)">
              <Input
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              />
            </Field>
          )}
          <Field label="Total Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Input
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>

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
