import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Shield, ShieldCheck, ShieldBan, Clock, Calendar, Building2, Tags, Trash2, UserX } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { UpdateRolesDrawer } from '../Users/components/UpdateRolesDrawer';
import { AssignOrgDrawer } from '../Organizations/components/AssignOrgDrawer';
import { UserStatusBadge } from '../../components/UserStatusBadge';
import { UserRolePills } from '../Users/components/UserRolePills';
import { ClerkUsers } from '../../api';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-b border-border py-3 last:border-0">
      <dt className="text-sm font-medium text-muted-foreground flex items-center">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="px-5">
        <dl>{children}</dl>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="h-40 rounded-xl bg-muted" />
      <div className="h-32 rounded-xl bg-muted" />
    </div>
  );
}

export default function UserDetailPage() {
  const { clerkUserId } = useParams<{ clerkUserId: string }>();
  const navigate = useNavigate();

  const [rolesOpen, setRolesOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [unbanOpen, setUnbanOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rolesQuery = ClerkUsers.useGetRoles(clerkUserId);

  // No get-by-clerk-id endpoint — hydrate from the list cache (page 1). Works for
  // recently-listed users; a direct deep link to a user past page 1 shows "not found".
  const listQuery = ClerkUsers.useList({ page: 1, enabled: true });
  const user = listQuery.data?.data.find((u) => u.clerkUserId === clerkUserId) ?? null;

  const banMutation = ClerkUsers.useBan();
  const unbanMutation = ClerkUsers.useUnban();
  const deleteMutation = ClerkUsers.useDelete();

  const loading = listQuery.isLoading && !user;

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : clerkUserId ?? 'User';

  const formatDate = (ts: number | null | undefined) => (ts ? new Date(ts).toLocaleString() : '—');

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <DetailSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <UserX size={40} className="text-muted-foreground" />
        <p className="text-lg font-semibold">User not found</p>
        <p className="text-sm text-muted-foreground">
          This Clerk user ID does not match any user in the current page.
        </p>
        <Button variant="outline" onClick={() => navigate('/users')}>
          <ArrowLeft size={15} /> Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/users')} className="-ml-1">
            <ArrowLeft size={16} /> Users
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium truncate max-w-[200px]">{displayName}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setRolesOpen(true)}>
            <Tags size={14} /> Edit Roles
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
            <Building2 size={14} /> Assign Org
          </Button>
          {user.banned ? (
            <Button size="sm" variant="outline" onClick={() => setUnbanOpen(true)}>
              <ShieldCheck size={14} /> Unban
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setBanOpen(true)}>
              <ShieldBan size={14} /> Ban
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-5 rounded-xl border border-border bg-card p-5 shadow-sm">
        <img
          src={user.imageUrl}
          alt={displayName}
          className="h-20 w-20 rounded-full object-cover ring-2 ring-border shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                [user.firstName, user.lastName].filter(Boolean).join('+') || user.email,
              )}&background=random&size=128`;
          }}
        />
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail size={13} /> {user.email}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <UserStatusBadge active={!user.banned} banned={user.banned} />
            {user.roles.length > 0 && <UserRolePills roles={user.roles} max={5} />}
          </div>
        </div>
      </div>

      <SectionCard title="Account Information" icon={<Shield size={15} />}>
        <DetailRow label="Clerk User ID">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{user.clerkUserId}</code>
        </DetailRow>
        <DetailRow label="Email">{user.email || '—'}</DetailRow>
        <DetailRow label="First Name">{user.firstName || '—'}</DetailRow>
        <DetailRow label="Last Name">{user.lastName || '—'}</DetailRow>
        <DetailRow label="Status">
          <UserStatusBadge active={!user.banned} banned={user.banned} />
        </DetailRow>
        <DetailRow label="Roles">
          {rolesQuery.isLoading ? (
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <UserRolePills roles={rolesQuery.data?.roles ?? user.roles} max={10} />
          )}
        </DetailRow>
      </SectionCard>

      <SectionCard title="Activity" icon={<Clock size={15} />}>
        <DetailRow label="Account Created">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-muted-foreground" />
            {formatDate(user.createdAt)}
          </span>
        </DetailRow>
        <DetailRow label="Last Sign In">
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-muted-foreground" />
            {formatDate(user.lastSignInAt)}
          </span>
        </DetailRow>
      </SectionCard>

      <UpdateRolesDrawer user={rolesOpen ? user : null} onClose={() => setRolesOpen(false)} />
      <AssignOrgDrawer user={assignOpen ? user : null} onClose={() => setAssignOpen(false)} />

      <ConfirmDialog
        open={banOpen}
        onOpenChange={(open) => !open && setBanOpen(false)}
        title="Ban User"
        description={`Ban "${displayName}"? They will immediately lose access to all sessions.`}
        confirmLabel="Ban User"
        pendingLabel="Banning…"
        confirmVariant="destructive"
        isPending={banMutation.isPending}
        onConfirm={() =>
          banMutation.mutate(user.clerkUserId, {
            onSuccess: () => { setBanOpen(false); navigate('/users'); },
          })
        }
      />

      <ConfirmDialog
        open={unbanOpen}
        onOpenChange={(open) => !open && setUnbanOpen(false)}
        title="Unban User"
        description={`Restore access for "${displayName}"?`}
        confirmLabel="Unban User"
        pendingLabel="Unbanning…"
        confirmVariant="default"
        isPending={unbanMutation.isPending}
        onConfirm={() => unbanMutation.mutate(user.clerkUserId, { onSuccess: () => setUnbanOpen(false) })}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => !open && setDeleteOpen(false)}
        title="Delete User"
        description={`Permanently delete "${displayName}"? This removes them from Clerk, all their sessions, org memberships, and cannot be undone.`}
        confirmLabel="Delete Forever"
        pendingLabel="Deleting…"
        confirmVariant="destructive"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(user.clerkUserId, {
            onSuccess: () => { setDeleteOpen(false); navigate('/users'); },
          })
        }
      />
    </div>
  );
}
