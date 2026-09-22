import { useMemo, useState } from 'react';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Taxes } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { Tax } from '../../types';

interface FormState {
  name: string;
  rate: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: '', rate: '', description: '', isActive: true };

export default function TaxesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Tax | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Tax | null>(null);

  const createMutation = Taxes.useCreate();
  const updateMutation = Taxes.useUpdate();
  const removeMutation = Taxes.useDelete();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const { data, isLoading, error, refetch } = Taxes.useSearch({ page, search: debouncedSearch });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: Tax) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      rate: row.rate != null ? String(row.rate) : '',
      description: row.description ?? '',
      isActive: row.isActive !== false,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(form.rate);
    if (!form.name.trim()) return;
    if (Number.isNaN(rate) || rate < 0 || rate > 100) return;

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, body: { name: form.name.trim(), rate, description: form.description || undefined, isActive: form.isActive } },
        { onSuccess: closeDrawer },
      );
    } else {
      createMutation.mutate(
        { name: form.name.trim(), rate, description: form.description || undefined },
        { onSuccess: closeDrawer },
      );
    }
  };

  const columns: Column<Tax>[] = useMemo(() => [
    { key: 'name', label: 'Name' },
    {
      key: 'rate',
      label: 'Rate',
      render: (row) => `${row.rate}%`,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) =>
        row.isActive ? (
          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            Inactive
          </span>
        ),
    },
  ], []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Taxes"
        description="Manage organisation tax rates applied to products."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search taxes…"
        isAdmin={true}
        onAdd={openCreate}
        addLabel="New Tax"
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Tax' : 'New Tax'}
        footer={
          <>
            <Button type="submit" form="tax-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="tax-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={100}
              autoFocus
              placeholder="e.g. Standard Tax"
            />
          </Field>
          <Field label="Rate (%)" required>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                required
                placeholder="e.g. 16"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                %
              </span>
            </div>
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
              className="resize-none"
            />
          </Field>
          {editing && (
            <Field label="Active">
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="tax-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
              </div>
            </Field>
          )}
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Tax"
        description={`Delete "${deleteTarget?.name}"? This will remove the tax. Products using it will bill at 0% until reassigned.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
