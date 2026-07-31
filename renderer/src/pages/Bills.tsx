import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Bills } from '../api';
import { usePagination } from '../hooks/usePagination';
import type { Bill } from '../types';

/** Wire amount: Response DTO uses `amount` but domain maps `totalAmount` — often both missing. */
function billAmount(row: Bill): number | undefined {
  if (row.amount != null) return Number(row.amount);
  if (row.totalAmount != null) return Number(row.totalAmount);
  return undefined;
}

interface FormState {
  billNumber: string;
  amount: string;
  status: string;
}

const EMPTY_FORM: FormState = { billNumber: '', amount: '', status: 'UNPAID' };

export default function BillsPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [viewRow, setViewRow] = useState<Bill | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Bill | null>(null);

  const createMutation = Bills.useCreate();
  const updateMutation = Bills.useUpdate();
  const removeMutation = Bills.useDelete();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, isError, error, refetch } = Bills.useSearch({ page, search: debouncedSearch });
  const listError = isError
    ? `Unable to load bills.${error instanceof Error && error.message ? ` (${error.message})` : ''}`
    : null;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: Bill) => {
    setEditing(row);
    const amt = billAmount(row);
    setForm({
      billNumber: row.billNumber ?? '',
      amount: amt != null ? String(amt) : '',
      status: row.status ?? '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      // UpdateBillRequest is status/amount — may still fail mapping; attempt update only.
      updateMutation.mutate(
        {
          id: editing.id,
          body: {
            amount: form.amount ? Number(form.amount) : undefined,
            status: form.status || undefined,
          },
        },
        { onSuccess: closeDrawer },
      );
      return;
    }
  };

  const columns: Column<Bill>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (row) => row.id.slice(0, 8),
    },
    {
      key: 'billNumber',
      label: 'Bill #',
      render: (row) => row.billNumber || '—',
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => {
        const amt = billAmount(row);
        return amt != null ? `$${amt.toFixed(2)}` : '—';
      },
    },
    { key: 'status', label: 'Status', render: (row) => row.status || '—' },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => row.createdAt || row.created_at || '—',
    },
  ];

  const isSaving = updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Create blocked — verified in core-apis: <code className="text-[10px]">CreateBillRequest</code> has no{' '}
        <code className="text-[10px]">@AutoMap</code> and fields (orgId/billNumber/amount) do not match command
        (supplierId/storeId/totalAmount). List/get usually only populate id/status/createdAt.
      </div>
      <DataTable
        title="Bills"
        description="Browse bills (create requires a Core API DTO fix)."
        columns={columns}
        rows={listError ? [] : (data?.items ?? [])}
        total={listError ? 0 : (data?.total ?? 0)}
        page={page}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search bills…"
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Bill"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      >
        {viewRow && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              const id = viewRow.id;
              setViewRow(null);
              navigate(`/bills/${id}`);
            }}
          >
            Open full page
          </Button>
        )}
      </ViewDrawer>

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Bill' : 'Add Bill'}
        footer={
          <>
            <Button
              type="submit"
              form="bill-form"
              disabled={!editing || isSaving || createMutation.isPending}
            >
              {editing ? (isSaving ? 'Saving…' : 'Save') : 'Create (blocked — Core API #0c)'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="bill-form" onSubmit={handleSubmit} className="space-y-5">
          {!editing && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Create cannot succeed until Core API aligns bill request ↔ command ↔ entity.
            </div>
          )}
          <Field label="Bill Number">
            <Input value={form.billNumber} disabled={!editing} onChange={(e) => setForm({ ...form, billNumber: e.target.value })} />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              disabled={!editing}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Input
              value={form.status}
              disabled={!editing}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>

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
