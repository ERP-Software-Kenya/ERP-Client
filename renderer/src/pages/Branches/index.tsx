import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';
import { Branches, Locations, OrganizationUsers, patch, useCopyMainBranchPrices } from '../../api';
import { DataTable, type Column } from '../../components/DataTable';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { BranchViewDrawer } from './BranchViewDrawer';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
  userId: string;
  locationIds: string[];
}

const EMPTY: FormState = {
  name: '',
  code: '',
  address: '',
  city: '',
  phone: '',
  userId: '',
  locationIds: [],
};

const NO_MANAGER = 'none';

export default function BranchesPage(): React.JSX.Element {
  const { isAdmin } = useSession();
  const { page, setPage, debouncedSearch, setSearch } = usePagination();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [viewRow, setViewRow] = useState<Branch | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Branch | null>(null);
  const [setMainTarget, setSetMainTarget] = useState<Branch | null>(null);
  const [pricingTarget, setPricingTarget] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data, isLoading, error, refetch } = Branches.useSearch({ page, search: debouncedSearch });
  const { data: locations = [] } = Locations.useList();
  const { data: membersPage } = OrganizationUsers.useMembers({ page: 1, limit: 100, status: 'active' });
  const createMutation = Branches.useCreate();
  const updateMutation = Branches.useUpdate();
  const copyPricesMutation = useCopyMainBranchPrices();

  const locationName = useMemo(
    () => new Map(locations.map((l: Location) => [l.id, l.name])),
    [locations],
  );
  const alreadyManagedUserIds = useMemo(
    () => new Set(
      (data?.items ?? [])
        .filter((b) => b.userId && b.id !== editing?.id)
        .map((b) => b.userId as string),
    ),
    [data?.items, editing?.id],
  );
  const managerOptions = useMemo(
    () => (membersPage?.items ?? []).filter(
      (member) => member.roleName === 'branch_manager' && !alreadyManagedUserIds.has(member.userId),
    ),
    [membersPage, alreadyManagedUserIds],
  );

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      label: 'Branch',
      render: (r) => (
        <span className="font-medium flex items-center gap-2">
          {r.name}
          {r.isMain && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              MAIN
            </span>
          )}
        </span>
      ),
    },
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
            {isAdmin && !r.isMain && r.isActive && (
              <DropdownMenuItem onClick={() => setSetMainTarget(r)}>
                Set as Main Branch
              </DropdownMenuItem>
            )}
            {r.isActive && !r.isMain && (
              <DropdownMenuItem className="text-destructive" onClick={() => setInactiveTarget(r)}>
                Inactive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const closeDrawer = (): void => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const openCreate = (): void => {
    setEditing(null);
    setForm(EMPTY);
    setDrawerOpen(true);
  };

  const openEdit = (row: Branch): void => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      address: row.address ?? '',
      city: row.city ?? '',
      phone: row.phone ?? '',
      userId: row.userId ?? '',
      locationIds: row.locationIds ?? [],
    });
    setDrawerOpen(true);
  };

  const handleSubmit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    if (!form.name.trim()) return;
    const body = {
      name: form.name.trim(),
      code: form.code || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      phone: form.phone || undefined,
      userId: form.userId || null,
      locationIds: form.locationIds,
    };
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, body },
        { onSuccess: () => { void refetch(); closeDrawer(); } },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: (newBranch) => {
          void refetch();
          closeDrawer();
          const hasMain = (data?.items ?? []).some((b) => b.isMain);
          if (hasMain) {
            setPricingTarget(newBranch);
          }
        },
      });
    }
  };

  const confirmInactive = async (): Promise<void> => {
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

  const confirmSetMain = async (): Promise<void> => {
    if (!setMainTarget) return;
    try {
      await patch<Branch>(`/api/v1/branches/${setMainTarget.id}/set-main`, {});
      toast.success(`"${setMainTarget.name}" is now the main branch`);
      setSetMainTarget(null);
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set main branch');
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

      <BranchViewDrawer
        branch={viewRow}
        locations={locations}
        onClose={() => setViewRow(null)}
        onEdit={(b) => { setViewRow(null); openEdit(b); }}
        onInactive={(b) => { setViewRow(null); setInactiveTarget(b); }}
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
          <Field label="Branch manager">
            <Select
              value={form.userId || NO_MANAGER}
              onValueChange={(value) => setForm({ ...form, userId: value === NO_MANAGER ? '' : value })}
            >
              <SelectTrigger><SelectValue placeholder="Select an active branch manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MANAGER}>No manager assigned</SelectItem>
                {managerOptions.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Only active organization users with the Branch Manager role are eligible.
            </p>
          </Field>
          <Field label="Locations">
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
              {locations
                .filter((location) => location.isActive !== false && (!location.branchId || location.branchId === editing?.id))
                .map((location) => (
                  <label key={location.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.locationIds.includes(location.id)}
                      onChange={(event) => setForm({
                        ...form,
                        locationIds: event.target.checked
                          ? [...form.locationIds, location.id]
                          : form.locationIds.filter((id) => id !== location.id),
                      })}
                    />
                    <span>{location.name}</span>
                    <span className="text-xs text-muted-foreground">({location.type})</span>
                  </label>
                ))}
              {!locations.some((location) => location.isActive !== false && (!location.branchId || location.branchId === editing?.id)) && (
                <p className="text-sm text-muted-foreground">No unassigned locations are available.</p>
              )}
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

      <ConfirmDialog
        open={setMainTarget != null}
        onOpenChange={(open) => { if (!open) setSetMainTarget(null); }}
        title="Set as main branch?"
        description={`"${setMainTarget?.name ?? ''}" will become the main branch. Product prices from this branch will be used as the reference for new branches.`}
        confirmLabel="Set as Main"
        confirmVariant="default"
        onConfirm={() => void confirmSetMain()}
      />

      <ConfirmDialog
        open={pricingTarget != null}
        onOpenChange={(open) => { if (!open) setPricingTarget(null); }}
        title="Copy main branch prices?"
        description={`Do you want to copy product prices from the main branch to "${pricingTarget?.name ?? ''}" now? You can always set them later from the Branch Pricing page.`}
        confirmLabel="Yes, copy now"
        confirmVariant="default"
        isPending={copyPricesMutation.isPending}
        onConfirm={() => {
          if (!pricingTarget) return;
          copyPricesMutation.mutate(pricingTarget.id, {
            onSuccess: () => setPricingTarget(null),
          });
        }}
      />
    </div>
  );
}
