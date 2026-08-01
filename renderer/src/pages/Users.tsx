import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { RecentIdPicker } from '../components/RecentIdPicker';
import { RecentRecords } from '../components/RecentRecords';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { Users, Organizations, Stores, get } from '../api';
import { AuthService } from '../services/auth.service';
import { formatEntityLabel } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
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

function userDisplayName(user: Pick<PlatformUser, 'firstName' | 'lastName'>) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

function userLabel(user: Pick<PlatformUser, 'id' | 'email' | 'firstName' | 'lastName'>) {
  const email = user.email?.trim();
  if (email) return email;
  const name = userDisplayName(user);
  if (name) return name;
  return formatEntityLabel({ id: user.id });
}

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function UsersPage() {
  const recent = useRecentIds(RECENT_NS.users);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [inviteForm, setInviteForm] = useState<InviteForm>(EMPTY_INVITE);
  const [lastCreated, setLastCreated] = useState<PlatformUser | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);
  const closeInvite = () => setInviteOpen(false);

  const createMutation = Users.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = Users.useGet(activeId);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['users', e.id] as const,
      queryFn: () => get<PlatformUser>(`/api/v1/users/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(
    () =>
      recent.entries.map((e, i) => {
        const q = i < HYDRATE_LIMIT ? recentQueries[i] : undefined;
        const data = q?.data;
        return {
          id: e.id,
          label: e.label,
          savedAt: e.savedAt,
          email: data?.email,
          name: data ? userDisplayName(data) : undefined,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = lookedUp;
    if (!loaded || loaded.id !== activeId) return;
    recent.push(loaded.id, userLabel(loaded));
  }, [activeId, lookedUp, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter a user ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadUser = () => loadById(lookupId);

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
    createMutation.mutate(
      {
        organizationId: form.organizationId || undefined,
        storeId: form.storeId || undefined,
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
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          recent.push(created.id, userLabel(created));
          closeDrawer();
          setForm(EMPTY_FORM);
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create platform users and reopen recent ones saved in this browser. Invite members via{' '}
            <code className="text-xs">POST /auth/invite</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
          <Button onClick={() => setDrawerOpen(true)}>New User</Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        API gap: Users have no list/search directory — use Recent, create, or Advanced load by ID.
      </p>

      <RecentRecords
        title="Recent users"
        emptyHint="No recent users yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'email',
            header: 'Email',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return r.label?.trim() || 'unavailable';
              return r.email || r.label || '—';
            },
          },
          {
            key: 'name',
            header: 'Name',
            render: (r) => (r.loading ? '…' : r.failed ? 'unavailable' : r.name || '—'),
          },
          {
            key: 'saved',
            header: 'Saved',
            render: (r) => new Date(r.savedAt).toLocaleString(),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => loadById(r.id)}>
                  Open
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(r.id)}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
        rowKey={(r) => r.id}
        onClear={recent.clear}
      />

      <AdvancedIdLookup entityLabel="user" value={lookupId} onChange={setLookupId} onLoad={loadUser} />

      {activeId && (
        <FormSection title="User">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">User not found.</p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {lookedUp.email ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Name:</span>{' '}
                {userDisplayName(lookedUp) || '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}

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
            <Button
              type="submit"
              form="invite-member-form"
              disabled={inviteMutation.isPending || !inviteForm.roleId.trim()}
            >
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
            The invitee must already have signed up via Clerk and be synced to the API. Pick a role
            from Recent (create one on the Roles page first) — there is no role directory API. Org is
            taken from your session — OrgAdmin / SuperAdmin only.
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
              emptyHint="No recent roles in this browser. Create or open a role on the Roles page first — there is no role directory API."
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
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Organization">
            <ResourceSelect
              resource={Organizations}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="Store (optional)">
            <ResourceSelect
              resource={Stores}
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
