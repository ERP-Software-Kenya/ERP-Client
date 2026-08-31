import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';
import { Branches, Locations, patch } from '../../api';
import { DataTable, type Column } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { ViewDrawer } from '../../components/ViewDrawer';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { usePagination } from '../../hooks/usePagination';
import { useSession } from '../../context/SessionContext';
import type { Branch, Location } from '../../types';

interface FormState {
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  locationIds: string[];
}

const EMPTY: FormState = {
  name: '',
  code: '',
  address: '',
  city: '',
  phone: '',
  locationIds: [],
};

export default function BranchesPage() {
  const { isAdmin } = useSession();
  const { page, setPage, debouncedSearch, setSearch } = usePagination();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [viewRow, setViewRow] = useState<Branch | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading, error, refetch } = Branches.useSearch({ page, search: debouncedSearch });
  const { data: locations = [] } = Locations.useList();
  const createMutation = Branches.useCreate();
  const updateMutation = Branches.useUpdate();

  const locationName = useMemo(
    () => new Map(locations.map((l: Location) => [l.id, l.name])),
    [locations],
  );

  const columns: Column<Branch>[] = [
    { key: 'name', label: 'Branch', render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: 'locationIds',
      label: 'Locations',
      render: (r) => (
        <span className="text-muted-foreground text-sm">
          {(r.locationIds ?? []).length
            ? (r.locationIds ?? []).map((id) => locationName.get(id) ?? id).join(', ')
            : '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (r) => (
        <span className={r.isActive ? 'text-emerald-600' : 'text-muted-foreground'}>
          {r.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Branch actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewRow(r)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(r)}>Update</DropdownMenuItem>
            {r.isActive && (
              <DropdownMenuItem className="text-destructive" onClick={() => setInactiveTarget(r)}>
                Inactive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDrawerOpen(true);
  };

  const openEdit = (row: Branch) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      address: row.address ?? '',
      city: row.city ?? '',
      phone: row.phone ?? '',
      locationIds: row.locationIds ?? [],
    });
    setDrawerOpen(true);
  };

  const toggleLocation = (id: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      locationIds: checked ? [...f.locationIds, id] : f.locationIds.filter((x) => x !== id),
    }));
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name.trim()) return;
    const body = {
      name: form.name.trim(),
      code: form.code || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      phone: form.phone || undefined,
      locationIds: form.locationIds,
    };
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, ...body },
        { onSuccess: () => { void refetch(); closeDrawer(); } },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => { void refetch(); closeDrawer(); },
      });
    }
  };

  const confirmInactive = async () => {
    if (!inactiveTarget) return;
    try {
      await patch<Branch>(`/api/v1/branches/${inactiveTarget.id}/inactive`, {});
      toast.success('Branch marked inactive');
      setInactiveTarget(null);
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to deactivate branch');
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        title="Branches"
        description="Group stores and warehouses under regional branches."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search branches…"
        isAdmin={isAdmin}
        onAdd={isAdmin ? openCreate : undefined}
        addLabel="Add Branch"
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Branch"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Update Branch' : 'Add Branch'}
        footer={
          <>
            <Button
              type="submit"
              form="branch-form"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="branch-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Code">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Stores & warehouses" hint="Select locations to include in this branch.">
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {locations.length === 0 && (
                <p className="text-sm text-muted-foreground">No locations available.</p>
              )}
              {locations.map((loc) => (
                <label key={loc.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.locationIds.includes(loc.id)}
                    onChange={(e) => toggleLocation(loc.id, e.target.checked)}
                  />
                  <span>{loc.name} ({loc.type})</span>
                </label>
              ))}
            </div>
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={inactiveTarget != null}
        onOpenChange={(open) => { if (!open) setInactiveTarget(null); }}
        title="Mark branch inactive?"
        description={`"${inactiveTarget?.name ?? ''}" will be marked inactive.`}
        confirmLabel="Inactive"
        onConfirm={() => void confirmInactive()}
      />
    </div>
  );
}
