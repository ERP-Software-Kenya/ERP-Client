import { useMemo, useState } from 'react';
import { MailOpen, RefreshCw, RotateCw, UserPlus, Users, XCircle } from 'lucide-react';
import { DataTable, type Column } from '../../components/DataTable';
import { FilterDropdown } from '../../components/FilterDropdown';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { UserRolePills } from '../../components/UserRolePills';
import { InviteUserDrawer } from './components/InviteUserDrawer';
import { Button } from '../../components/ui/button';
import { OrganizationUsers } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { OrganizationInvitation, OrganizationInvitationStatus, OrganizationMember } from '../../types';

const MEMBER_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'removed', label: 'Removed' },
];

const INVITATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
  { value: 'failed', label: 'Failed' },
];

const INVITATION_STATUS_BADGE: Record<OrganizationInvitationStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  accepted: 'bg-green-500/10 text-green-600 border-green-500/20',
  expired: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  revoked: 'bg-red-500/10 text-red-500 border-red-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const MEMBER_STATUS_BADGE: Record<OrganizationMember['status'], string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  suspended: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  removed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const memberColumns: Column<OrganizationMember>[] = [
  {
    key: 'name',
    label: 'Name',
    render: (member) => <span className="font-medium">{[member.firstName, member.lastName].filter(Boolean).join(' ') || '—'}</span>,
  },
  { key: 'email', label: 'Email', render: (member) => <span className="text-muted-foreground">{member.email}</span> },
  { key: 'roleName', label: 'Role', render: (member) => <UserRolePills roles={[member.roleName]} /> },
  { key: 'locationName', label: 'Store access', render: (member) => member.locationName || 'Organization-wide' },
  {
    key: 'status',
    label: 'Status',
    render: (member) => (
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${MEMBER_STATUS_BADGE[member.status]}`}>
        {member.status}
      </span>
    ),
  },
  { key: 'joinedAt', label: 'Joined', render: (member) => member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—' },
];

export default function UsersPage(): React.JSX.Element {
  const { page, setPage, debouncedSearch, setSearch } = usePagination();
  const [memberStatus, setMemberStatus] = useState<string | null>(null);
  const [invitationStatus, setInvitationStatus] = useState<OrganizationInvitationStatus | null>('pending');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showInvitations, setShowInvitations] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<OrganizationInvitation | null>(null);

  const membersQuery = OrganizationUsers.useMembers({
    page,
    search: debouncedSearch.trim() || undefined,
    status: memberStatus || undefined,
  });
  const invitationsQuery = OrganizationUsers.useInvitations();
  const allInvitations = invitationsQuery.data?.items ?? [];
  const invitations = invitationStatus
    ? allInvitations.filter((invitation) => invitation.status === invitationStatus)
    : allInvitations;
  const pendingCount = allInvitations.filter((invitation) => invitation.status === 'pending').length;
  const resendMutation = OrganizationUsers.useResendInvitation();
  const revokeMutation = OrganizationUsers.useRevokeInvitation();

  const toolbar = (
    <>
      <FilterDropdown label="Member status" options={MEMBER_STATUS_OPTIONS} value={memberStatus}
        onChange={(value) => { setMemberStatus(value); setPage(1); }} align="start" />
      <Button size="sm" variant={showInvitations ? 'default' : 'outline'}
        onClick={() => setShowInvitations((visible) => !visible)} className="gap-1.5">
        <MailOpen size={14} /> Invitations
        {pendingCount > 0 && <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.6rem] font-bold leading-none text-white">{pendingCount}</span>}
      </Button>
      <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5"><UserPlus size={14} /> Add user</Button>
    </>
  );

  const memberPage = membersQuery.data;
  const activeMembers = useMemo(() => (memberPage?.items ?? []).filter((member) => member.status === 'active').length, [memberPage?.items]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard icon={<Users size={17} />} label="Members" value={memberPage?.total ?? 0} />
        <SummaryCard icon={<Users size={17} />} label="Active on this page" value={activeMembers} />
        <SummaryCard icon={<MailOpen size={17} />} label="Pending invitations" value={pendingCount} />
      </div>

      <DataTable<OrganizationMember>
        title="Organization users"
        description="ERP memberships, roles and store access are managed locally and do not consume Clerk organization seats."
        columns={memberColumns} rows={memberPage?.items ?? []} total={memberPage?.total ?? 0} page={page}
        loading={membersQuery.isLoading} error={membersQuery.error ? String(membersQuery.error) : null}
        onPageChange={setPage} onSearchChange={setSearch} onRefetch={() => void membersQuery.refetch()}
        searchPlaceholder="Search members by name or email…" toolbar={toolbar}
        emptyState="No organization members found. Invite the first user to get started."
      />

      {showInvitations && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><h3 className="text-sm font-semibold">Organization invitations</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Invitations remain in ERP until accepted, expired or revoked.</p></div>
            <div className="flex items-center gap-2">
              <FilterDropdown label="Status" options={INVITATION_STATUS_OPTIONS} value={invitationStatus}
                onChange={(value) => setInvitationStatus(value as OrganizationInvitationStatus | null)} align="end" />
              <Button variant="ghost" size="icon" onClick={() => void invitationsQuery.refetch()} title="Refresh invitations">
                <RefreshCw size={14} className={invitationsQuery.isFetching ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {invitationsQuery.isLoading ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading invitations…</div>
            : invitations.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">No invitations found.</div>
              : <InvitationTable invitations={invitations} resendPending={resendMutation.isPending}
                  onResend={(id) => resendMutation.mutate(id)} onRevoke={setRevokeTarget} />}
        </div>
      )}

      <InviteUserDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ConfirmDialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke invitation" description={`Revoke the invitation for “${revokeTarget?.email ?? ''}”? Its app link will stop working.`}
        confirmLabel="Revoke" pendingLabel="Revoking…" confirmVariant="destructive" isPending={revokeMutation.isPending}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id, { onSuccess: () => setRevokeTarget(null) })} />
    </div>
  );
}

function InvitationTable({ invitations, resendPending, onResend, onRevoke }: {
  invitations: OrganizationInvitation[]; resendPending: boolean; onResend: (id: string) => void;
  onRevoke: (invitation: OrganizationInvitation) => void;
}): React.JSX.Element {
  return <div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr className="border-b border-border bg-muted/40 text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
      <th className="px-4 py-2 text-left">Invitee</th><th className="px-4 py-2 text-left">Role</th>
      <th className="px-4 py-2 text-left">Store</th><th className="px-4 py-2 text-left">Status</th>
      <th className="px-4 py-2 text-left">Expires</th><th className="px-4 py-2 text-left">Sent</th><th className="px-4 py-2" />
    </tr></thead>
    <tbody className="divide-y divide-border">{invitations.map((invitation) => <tr key={invitation.id} className="transition-colors hover:bg-muted/20">
      <td className="px-4 py-2.5"><div className="font-medium">{[invitation.firstName, invitation.lastName].filter(Boolean).join(' ') || invitation.email}</div>
        {(invitation.firstName || invitation.lastName) && <div className="text-xs text-muted-foreground">{invitation.email}</div>}</td>
      <td className="px-4 py-2.5"><UserRolePills roles={[invitation.roleName || 'Pending role']} /></td>
      <td className="px-4 py-2.5">{invitation.locationName || 'Organization-wide'}</td>
      <td className="px-4 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${INVITATION_STATUS_BADGE[invitation.status]}`}>{invitation.status}</span></td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(invitation.expiresAt).toLocaleDateString()}</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{invitation.sendCount ?? 1} time{(invitation.sendCount ?? 1) === 1 ? '' : 's'}</td>
      <td className="px-4 py-2.5 text-right">
        {(invitation.status === 'pending' || invitation.status === 'expired' || invitation.status === 'failed') &&
          <Button variant="ghost" size="sm" className="gap-1 text-xs" disabled={resendPending} onClick={() => onResend(invitation.id)}><RotateCw size={13} /> Resend</Button>}
        {invitation.status === 'pending' && <Button variant="ghost" size="sm" className="gap-1 text-xs text-red-500" onClick={() => onRevoke(invitation)}><XCircle size={13} /> Revoke</Button>}
      </td>
    </tr>)}</tbody>
  </table></div>;
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }): React.JSX.Element {
  return <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
    <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
    <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>
  </div>;
}
