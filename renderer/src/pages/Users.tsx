import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { RecentIdPicker } from '../components/RecentIdPicker';
import { DataTable, Column } from '../components/DataTable';
import { ViewDrawer } from '../components/ViewDrawer';
import { PendingInvitesTrigger } from '../components/PendingInvitesPanel';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { Users, OrgMembers, Organizations, Locations } from '../api';
import { AuthService } from '../services/auth.service';
import { RECENT_NS } from '../lib/recentIds';
import { usePagination } from '../hooks/usePagination';
import type { OrgMemberDetail } from '../types';

// NEEDS BACKEND: GET /api/v1/auth/members (list/search org members with phone/role/pending status)
// — see docs/superpowers/plans/2026-08-04-backend-requirements.md. Until it exists, the table
// below will show a load error — that's expected, not a frontend bug.

interface FormState {
  organizationId: string;
  locationId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  isActive: boolean;
}

interface InviteForm {
  email: string;
  roleId: string;
}

const EMPTY_FORM: FormState = {
  organizationId: '', locationId: '', email: '', passwordHash: '',
  firstName: '', lastName: '', phone: '', isActive: true,
};

const EMPTY_INVITE: InviteForm = { email: '', roleId: '' };

function memberDisplayName(row: OrgMemberDetail) {
  return [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
}

export default function UsersPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [inviteForm, setInviteForm] = useState<InviteForm>(EMPTY_INVITE);
  const [viewRow, setViewRow] = useState<OrgMemberDetail | null>(null);

  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const createMutation = Users.useCreate();
  const { data, isLoading, isError, error, refetch } = OrgMembers.useSearch({
    page,
    limit: 15,
    search: debouncedSearch,
  });

  const listError = isError
    ? `Unable to load members.${error instanceof Error && error.message ? ` (${error.message})` : ''}`
    : null;
  const memberRows = listError ? [] : (data?.items ?? []);
  const total = data?.total ?? 0;

  const closeDrawer = () => setDrawerOpen(false);
  const closeInvite = () => setInviteOpen(false);

  const inviteMutation = useMutation({
    mutationFn: () => AuthService.inviteMember({ email: inviteForm.email.trim(), roleId: inviteForm.roleId.trim() }),
    onSuccess: (result) => {
      toast.success(`Invite sent (${result.status})`);
      setInviteForm(EMPTY_INVITE);
      closeInvite();
    },
    onError: (err: Error) => toast.error(err.message || 'Invite failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        organizationId: form.organizationId || undefined,
        locationId: form.locationId || undefined,
        email: form.email || undefined,
        passwordHash: form.passwordHash || undefined,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phone: form.phone || undefined,
        isActive: form.isActive,
      },
      {
        onSuccess: (created) => {
          toast.success(`User "${created.email}" created`);
          closeDrawer();
          setForm(EMPTY_FORM);
          refetch();
        },
      },
    );
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.roleId.trim()) {
      toast.error('Email and role are required');
      return;
    }
    inviteMutation.mutate();
  };

  const columns: Column<OrgMemberDetail>[] = [
    { key: 'name', label: 'Name', render: (row) => memberDisplayName(row) || '—' },
    { key: 'email', label: 'Email', render: (row) => row.email || row.invitedEmail || '—' },
    { key: 'phone', label: 'Phone', render: (row) => row.phone || '—' },
    { key: 'createdAt', label: 'Created', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—' },
    { key: 'role', label: 'Role', render: (row) => row.role || '—' },
    { key: 'status', label: 'Status', render: (row) => row.status === 'invited' ? 'Pending' : (row.isActive ? 'Active' : 'Inactive') },
  ];

  return (
    <div className="flex h-full flex-col">
      <DataTable
        title="Users"
        description="Organization members — active and pending invites."
        columns={columns}
        rows={memberRows}
        total={total}
        page={page}
        loading={isLoading}
        error={listError}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={refetch}
        onView={setViewRow}
        toolbar={
          <div className="flex gap-2">
            <PendingInvitesTrigger />
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
            <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }}>
              New User
            </Button>
          </div>
        }
      />

      <ViewDrawer
        title={viewRow ? memberDisplayName(viewRow) || viewRow.email || viewRow.invitedEmail || viewRow.id : ''}
        data={null}
        open={!!viewRow}
        onClose={() => setViewRow(null)}
      >
        {viewRow && (
          <div className="space-y-4">
            <FormSection title="Core details">
              <div className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <p><span className="font-medium text-muted-foreground">ID:</span> {viewRow.id}</p>
                <p><span className="font-medium text-muted-foreground">Email:</span> {viewRow.email || viewRow.invitedEmail || '—'}</p>
                <p><span className="font-medium text-muted-foreground">Name:</span> {memberDisplayName(viewRow) || '—'}</p>
                <p><span className="font-medium text-muted-foreground">Phone:</span> {viewRow.phone || '—'}</p>
                <p><span className="font-medium text-muted-foreground">Role:</span> {viewRow.role || '—'}</p>
                <p><span className="font-medium text-muted-foreground">Status:</span> {viewRow.status === 'invited' ? 'Pending' : (viewRow.isActive ? 'Active' : 'Inactive')}</p>
              </div>
            </FormSection>
          </div>
        )}
      </ViewDrawer>

      <FormDrawer
        open={inviteOpen}
        onClose={closeInvite}
        title="Invite organization member"
        footer={
          <>
            <Button type="submit" form="invite-member-form" disabled={inviteMutation.isPending || !inviteForm.roleId.trim()}>
              {inviteMutation.isPending ? 'Inviting…' : 'Send invite'}
            </Button>
            <Button type="button" variant="outline" onClick={closeInvite}>Cancel</Button>
          </>
        }
      >
        <form id="invite-member-form" onSubmit={handleInvite} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            The invitee must already have signed up via Clerk and be synced to the API.
          </p>
          <Field label="Email" required>
            <Input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="member@acme.com"
              required
              autoFocus
            />
          </Field>
          <Field label="Role" required>
            <RecentIdPicker
              namespace={RECENT_NS.roles}
              value={inviteForm.roleId}
              onSelect={(id) => setInviteForm({ ...inviteForm, roleId: id })}
              emptyHint="No recent roles in this browser. Create or open a role on the Roles page first."
            />
            <p className="mt-2 text-xs text-muted-foreground">or enter an ID</p>
            <Input
              className="mt-1"
              placeholder="Paste role ID"
              value={inviteForm.roleId}
              onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
              required
            />
          </Field>
        </form>
      </FormDrawer>

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New User"
        footer={
          <>
            <Button type="submit" form="user-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>Cancel</Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Organization">
            <ResourceSelect resource={Organizations} getLabel={(org) => org.name} value={form.organizationId} onValueChange={(v) => setForm({ ...form, organizationId: v })} placeholder="Select organization…" />
          </Field>
          <Field label="Location (optional)">
            <ResourceSelect resource={Locations} getLabel={(s) => s.name} value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v })} placeholder="Select location…" allowNone />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Password Hash" required>
            <Input placeholder="Pre-hashed value — the API stores this as-is" value={form.passwordHash} onChange={(e) => setForm({ ...form, passwordHash: e.target.value })} required />
          </Field>
          <Field label="First Name" required>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </Field>
          <Field label="Last Name" required>
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </Field>
          <Field label="Phone (optional)">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Active">
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" className="h-4 w-4 rounded border-input" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            </div>
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
