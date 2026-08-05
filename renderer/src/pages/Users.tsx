import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldBan, ShieldCheck, UserPlus, Tags, Building2 } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { FilterDropdown } from '../components/FilterDropdown';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UserStatusBadge } from '../components/UserStatusBadge';
import { UserRolePills } from '../components/UserRolePills';
import { InviteUserDrawer } from '../components/InviteUserDrawer';
import { UpdateRolesDrawer } from '../components/UpdateRolesDrawer';
import { AssignOrgDrawer } from '../components/AssignOrgDrawer';
import { Button } from '../components/ui/button';
import { ClerkUsers } from '../api';
import { useAuth } from '../context/AuthContext';
import { usePagination } from '../hooks/usePagination';
import type { ClerkUser } from '../types';
import type { ExtraAction } from '../components/RowActionsMenu';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
];

function buildColumns(): Column<ClerkUser>[] {
  return [
    {
      key: 'avatar',
      label: '',
      width: '44px',
      render: (row) => (
        <img
          src={row.imageUrl}
          alt={row.firstName ?? row.email}
          className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                [row.firstName, row.lastName].filter(Boolean).join('+') || row.email,
              )}&background=random&size=64`;
          }}
        />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row) => {
        const name = [row.firstName, row.lastName].filter(Boolean).join(' ');
        return name ? (
          <span className="font-medium">{name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => <span className="text-muted-foreground">{row.email || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <UserStatusBadge active={!row.banned} banned={row.banned} />,
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (row) => <UserRolePills roles={row.roles} />,
    },
    {
      key: 'lastSignInAt',
      label: 'Last Sign In',
      render: (row) =>
        row.lastSignInAt ? (
          new Date(row.lastSignInAt).toLocaleDateString()
        ) : (
          <span className="text-muted-foreground">Never</span>
        ),
    },
  ];
}

export default function UsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = user?.organization?.id;

  const { page, setPage, debouncedSearch, setSearch } = usePagination();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rolesTarget, setRolesTarget] = useState<ClerkUser | null>(null);
  const [assignTarget, setAssignTarget] = useState<ClerkUser | null>(null);
  const [banTarget, setBanTarget] = useState<ClerkUser | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<ClerkUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClerkUser | null>(null);

  const isSearching = debouncedSearch.trim().length > 0;

  const listQuery = ClerkUsers.useList({ page, organizationId: orgId, enabled: !isSearching });
  const searchQuery = ClerkUsers.useSearch({ query: debouncedSearch, page, enabled: isSearching });

  const activeQuery = isSearching ? searchQuery : listQuery;
  const rawRows = activeQuery.data?.data ?? [];
  const rawTotal = activeQuery.data?.totalCount ?? 0;

  // Clerk list API doesn't support a banned filter — applied client-side on the current page.
  const filteredRows = useMemo(() => {
    if (!statusFilter) return rawRows;
    if (statusFilter === 'banned') return rawRows.filter((r) => r.banned);
    if (statusFilter === 'active') return rawRows.filter((r) => !r.banned);
    return rawRows;
  }, [rawRows, statusFilter]);

  const banMutation = ClerkUsers.useBan();
  const unbanMutation = ClerkUsers.useUnban();
  const deleteMutation = ClerkUsers.useDelete();

  const extraRowActions = useCallback(
    (row: ClerkUser): ExtraAction[] => [
      { label: 'Edit Roles', icon: <Tags size={14} />, onSelect: () => setRolesTarget(row) },
      { label: 'Assign to Org', icon: <Building2 size={14} />, onSelect: () => setAssignTarget(row) },
      row.banned
        ? { label: 'Unban User', icon: <ShieldCheck size={14} />, onSelect: () => setUnbanTarget(row) }
        : {
            label: 'Ban User',
            icon: <ShieldBan size={14} />,
            onSelect: () => setBanTarget(row),
            destructive: true,
          },
    ],
    [],
  );

  const toolbar = (
    <>
      <FilterDropdown
        label="Status"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={setStatusFilter}
        align="start"
      />
      <Button size="sm" onClick={() => setInviteOpen(true)}>
        <UserPlus size={14} /> Invite User
      </Button>
    </>
  );

  const columns = useMemo(() => buildColumns(), []);

  return (
    <div className="flex h-full flex-col gap-0">
      <DataTable<ClerkUser>
        title="Users"
        description={orgId ? `Clerk users in your organisation — ${rawTotal} total` : 'All Clerk users'}
        columns={columns}
        rows={filteredRows}
        total={statusFilter ? filteredRows.length : rawTotal}
        page={page}
        loading={activeQuery.isLoading}
        error={activeQuery.error ? String(activeQuery.error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void activeQuery.refetch()}
        searchPlaceholder="Search by name or email…"
        toolbar={toolbar}
        isAdmin={true}
        onView={(row) => navigate(`/users/clerk/${row.clerkUserId}`)}
        onDelete={(row) => setDeleteTarget(row)}
        extraRowActions={extraRowActions}
        footerNote={
          statusFilter
            ? `Showing filtered results — clear the Status filter to see all ${rawTotal} users`
            : undefined
        }
      />

      <InviteUserDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <UpdateRolesDrawer user={rolesTarget} onClose={() => setRolesTarget(null)} />
      <AssignOrgDrawer user={assignTarget} onClose={() => setAssignTarget(null)} />

      <ConfirmDialog
        open={!!banTarget}
        onOpenChange={(open) => !open && setBanTarget(null)}
        title="Ban User"
        description={`Ban "${banTarget ? [banTarget.firstName, banTarget.lastName].filter(Boolean).join(' ') || banTarget.email : ''}"? They will immediately lose access to all sessions.`}
        confirmLabel="Ban User"
        pendingLabel="Banning…"
        confirmVariant="destructive"
        isPending={banMutation.isPending}
        onConfirm={() =>
          banTarget &&
          banMutation.mutate(banTarget.clerkUserId, { onSuccess: () => setBanTarget(null) })
        }
      />

      <ConfirmDialog
        open={!!unbanTarget}
        onOpenChange={(open) => !open && setUnbanTarget(null)}
        title="Unban User"
        description={`Restore access for "${unbanTarget ? [unbanTarget.firstName, unbanTarget.lastName].filter(Boolean).join(' ') || unbanTarget.email : ''}"?`}
        confirmLabel="Unban User"
        pendingLabel="Unbanning…"
        confirmVariant="default"
        isPending={unbanMutation.isPending}
        onConfirm={() =>
          unbanTarget &&
          unbanMutation.mutate(unbanTarget.clerkUserId, { onSuccess: () => setUnbanTarget(null) })
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete User"
        description={`Permanently delete "${deleteTarget ? [deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(' ') || deleteTarget.email : ''}" from Clerk? This cannot be undone and removes all their sessions, data, and org memberships.`}
        confirmLabel="Delete Forever"
        pendingLabel="Deleting…"
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate(deleteTarget.clerkUserId, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
