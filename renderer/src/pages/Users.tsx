import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { Users as UsersApi, Organizations as OrganizationsApi, Stores as StoresApi } from '../api';
import { AuthService } from '../services/auth.service';
import type { PlatformUser } from '../types';

interface FormState {
  organizationId: string;
  storeId: string;
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

interface InviteResult {
  membershipId: string;
  status: string;
  email: string;
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  storeId: '',
  email: '',
  passwordHash: '',
  firstName: '',
  lastName: '',
  phone: '',
  isActive: true,
};

const EMPTY_INVITE: InviteForm = { email: '', roleId: '' };

export default function Users() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [inviteForm, setInviteForm] = useState<InviteForm>(EMPTY_INVITE);
  const [lastCreated, setLastCreated] = useState<PlatformUser | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);

  const closeDrawer = () => setDrawerOpen(false);
  const closeInvite = () => setInviteOpen(false);

  const createMutation = useMutation({
    mutationFn: (body: Partial<PlatformUser>) => UsersApi.create(body),
    onSuccess: (created) => {
      toast.success(`User "${created.email}" created`);
      setLastCreated(created);
      closeDrawer();
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create user'),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      AuthService.inviteMember({
        email: inviteForm.email.trim(),
        roleId: inviteForm.roleId.trim(),
      }),
    onSuccess: (result) => {
      toast.success(`Invite sent (${result.status})`);
      setLastInvite({
        membershipId: result.membershipId,
        status: result.status,
        email: inviteForm.email.trim(),
      });
      setInviteForm(EMPTY_INVITE);
      closeInvite();
    },
    onError: (err: Error) => toast.error(err.message || 'Invite failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      organizationId: form.organizationId || undefined,
      storeId: form.storeId || undefined,
      email: form.email || undefined,
      passwordHash: form.passwordHash || undefined,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      phone: form.phone || undefined,
      isActive: form.isActive,
    });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.roleId.trim()) {
      toast.error('Email and role ID are required');
      return;
    }
    inviteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create platform users, or invite an existing Clerk user into your organization via{' '}
            <code className="text-xs">POST /auth/invite</code>. No users list endpoint exists.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
          <Button onClick={() => setDrawerOpen(true)}>New User</Button>
        </div>
      </div>

      {lastCreated && (
        <FormSection title="Last created user">
          <div className="text-sm space-y-1">
            <div>ID: {lastCreated.id}</div>
            <div>Email: {lastCreated.email}</div>
          </div>
        </FormSection>
      )}

      {lastInvite && (
        <FormSection title="Last invite">
          <div className="text-sm space-y-1">
            <div>Email: {lastInvite.email}</div>
            <div>Membership ID: {lastInvite.membershipId}</div>
            <div>Status: {lastInvite.status}</div>
          </div>
        </FormSection>
      )}

      <FormDrawer
        open={inviteOpen}
        onClose={closeInvite}
        title="Invite organization member"
        footer={
          <>
            <Button type="submit" form="invite-member-form" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Inviting…' : 'Send invite'}
            </Button>
            <Button type="button" variant="outline" onClick={closeInvite}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="invite-member-form" onSubmit={handleInvite} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            The invitee must already have signed up via Clerk and be synced to the API. Role UUID
            comes from the Roles page (create a role, copy its id). Org is taken from your session —
            OrgAdmin / SuperAdmin only.
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
          <Field label="Role ID (UUID)" required>
            <Input
              value={inviteForm.roleId}
              onChange={(e) => setInviteForm({ ...inviteForm, roleId: e.target.value })}
              placeholder="Paste role UUID…"
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
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Organization">
            <ResourceSelect
              queryKey="organizations"
              fetchList={() => OrganizationsApi.list()}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="Store (optional)">
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
          <Field label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Password Hash" required>
            <Input
              placeholder="Pre-hashed value — the API stores this as-is"
              value={form.passwordHash}
              onChange={(e) => setForm({ ...form, passwordHash: e.target.value })}
              required
            />
          </Field>
          <Field label="First Name" required>
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </Field>
          <Field label="Last Name" required>
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </Field>
          <Field label="Phone (optional)">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Active">
            <div className="flex items-center gap-2 pt-1">
              <input
                id="user-active"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
            </div>
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
