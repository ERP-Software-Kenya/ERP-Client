import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { RecentIdPicker } from '../components/RecentIdPicker';
import { RecentRecords } from '../components/RecentRecords';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { UserRoles, get } from '../api';
import { formatEntityLabel } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { UserRole } from '../types';

interface FormState {
  userId: string;
  roleId: string;
}

const EMPTY_FORM: FormState = { userId: '', roleId: '' };

function assignmentLabel(
  assignment: Pick<UserRole, 'id' | 'userId' | 'roleId'>,
  userLabels: Map<string, string | undefined>,
  roleLabels: Map<string, string | undefined>,
) {
  const userPart = assignment.userId
    ? userLabels.get(assignment.userId) ?? formatEntityLabel({ id: assignment.userId })
    : '—';
  const rolePart = assignment.roleId
    ? roleLabels.get(assignment.roleId) ?? formatEntityLabel({ id: assignment.roleId })
    : '—';
  if (assignment.userId || assignment.roleId) return `${userPart} → ${rolePart}`;
  return formatEntityLabel({ id: assignment.id });
}

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function UserRolesPage() {
  const recent = useRecentIds(RECENT_NS.userRoles);
  const recentUsers = useRecentIds(RECENT_NS.users);
  const recentRoles = useRecentIds(RECENT_NS.roles);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<UserRole | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = UserRoles.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = UserRoles.useGet(activeId);

  const recentUserLabels = useMemo(
    () => new Map(recentUsers.entries.map((e) => [e.id, e.label])),
    [recentUsers.entries],
  );

  const recentRoleLabels = useMemo(
    () => new Map(recentRoles.entries.map((e) => [e.id, e.label])),
    [recentRoles.entries],
  );

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['user-roles', e.id] as const,
      queryFn: () => get<UserRole>(`/api/v1/user-roles/${e.id}`),
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
          userId: data?.userId,
          roleId: data?.roleId,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = lookedUp;
    if (!loaded || loaded.id !== activeId) return;
    recent.push(
      loaded.id,
      assignmentLabel(loaded, recentUserLabels, recentRoleLabels),
    );
  }, [activeId, lookedUp, recent.push, recentUserLabels, recentRoleLabels]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter a user-role assignment ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadAssignment = () => loadById(lookupId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        userId: form.userId || undefined,
        roleId: form.roleId || undefined,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          recent.push(
            created.id,
            assignmentLabel(
              {
                id: created.id,
                userId: created.userId ?? form.userId,
                roleId: created.roleId ?? form.roleId,
              },
              recentUserLabels,
              recentRoleLabels,
            ),
          );
          closeDrawer();
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  const labelForUserId = (userId: string | undefined) =>
    userId ? recentUserLabels.get(userId) ?? formatEntityLabel({ id: userId }) : '—';

  const labelForRoleId = (roleId: string | undefined) =>
    roleId ? recentRoleLabels.get(roleId) ?? formatEntityLabel({ id: roleId }) : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Assign roles to users using Recent picks from the Users and Roles pages saved in this
            browser.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Assignment</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        API gap: User roles have no list/search directory — use Recent, create, or Advanced load by
        ID. Users and roles also have no directory APIs; create or open them on their pages first.
      </p>

      <RecentRecords
        title="Recent assignments"
        emptyHint="No recent assignments yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'user',
            header: 'User',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return r.label?.trim() || formatEntityLabel({ id: r.id });
              return labelForUserId(r.userId);
            },
          },
          {
            key: 'role',
            header: 'Role',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return r.label?.trim() || formatEntityLabel({ id: r.id });
              return labelForRoleId(r.roleId);
            },
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

      <AdvancedIdLookup
        entityLabel="user-role assignment"
        value={lookupId}
        onChange={setLookupId}
        onLoad={loadAssignment}
      />

      {activeId && (
        <FormSection title="Assignment">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">Assignment not found.</p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">User:</span> {labelForUserId(lookedUp.userId)}
                {lookedUp.userId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => copyId(lookedUp.userId!)}
                  >
                    Copy ID
                  </Button>
                ) : null}
              </p>
              <p>
                <span className="text-muted-foreground">Role:</span> {labelForRoleId(lookedUp.roleId)}
                {lookedUp.roleId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => copyId(lookedUp.roleId!)}
                  >
                    Copy ID
                  </Button>
                ) : null}
              </p>
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created assignment</div>
          <div>ID: {lastCreated.id}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New User Role Assignment"
        footer={
          <>
            <Button
              type="submit"
              form="user-role-form"
              disabled={createMutation.isPending || !form.userId.trim() || !form.roleId.trim()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="user-role-form" onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Pick a user and role from Recent. Create or open records on the Users and Roles pages
            first — there are no user or role directory APIs.
          </p>
          <Field label="User" required>
            <RecentIdPicker
              namespace={RECENT_NS.users}
              value={form.userId}
              onSelect={(id) => setForm({ ...form, userId: id })}
              emptyHint="No recent users in this browser. Create or open a user on the Users page first."
            />
            <p className="mt-2 text-xs text-muted-foreground">or enter an ID</p>
            <Input
              className="mt-1"
              placeholder="Paste user ID"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              required
            />
          </Field>
          <Field label="Role" required>
            <RecentIdPicker
              namespace={RECENT_NS.roles}
              value={form.roleId}
              onSelect={(id) => setForm({ ...form, roleId: id })}
              emptyHint="No recent roles in this browser. Create or open a role on the Roles page first."
            />
            <p className="mt-2 text-xs text-muted-foreground">or enter an ID</p>
            <Input
              className="mt-1"
              placeholder="Paste role ID"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
