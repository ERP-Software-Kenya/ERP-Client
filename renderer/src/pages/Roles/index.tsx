import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../../components/AdvancedIdLookup';
import { FormDrawer, Field, FormSection } from '../../components/FormDrawer';
import { RecentRecords } from '../../components/RecentRecords';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ResourceSelect } from '../../components/ResourceSelect';
import { Roles, Organizations, get } from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../../lib/recentIds';
import { ROLE_NAMES, type Role } from '../../types';

interface FormState {
  organizationId: string;
  name: string;
  permissions: string;
}

const EMPTY_FORM: FormState = { organizationId: '', name: ROLE_NAMES[0], permissions: '{}' };

function roleLabel(role: Pick<Role, 'id' | 'name'>) {
  const name = role.name?.trim();
  if (name) return name;
  return formatEntityLabel({ id: role.id });
}

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function RolesPage() {
  const recent = useRecentIds(RECENT_NS.roles);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<Role | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);

  const createMutation = Roles.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = Roles.useGet(activeId);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['roles', e.id] as const,
      queryFn: () => get<Role>(`/api/v1/roles/${e.id}`),
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
          name: data?.name,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = lookedUp;
    if (!loaded || loaded.id !== activeId) return;
    recent.push(loaded.id, roleLabel(loaded));
  }, [activeId, lookedUp, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter a role ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadRole = () => loadById(lookupId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let permissions: Record<string, unknown>;
    try {
      permissions = JSON.parse(form.permissions || '{}');
    } catch {
      setJsonError('Permissions must be valid JSON');
      return;
    }
    setJsonError(null);
    createMutation.mutate(
      {
        organizationId: form.organizationId || undefined,
        name: form.name,
        permissions,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          recent.push(created.id, roleLabel(created));
          closeDrawer();
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create roles and reopen recent ones saved in this browser. Name is one of four fixed
            values (unique per role). Organization and Permissions are required by validation but the
            role entity currently has no matching columns — the backend accepts and silently
            discards them.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Role</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        API gap: Roles have no list/search directory — use Recent, create, or Advanced load by ID.
      </p>

      <RecentRecords
        title="Recent roles"
        emptyHint="No recent roles yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return r.label?.trim() || 'unavailable';
              return r.name || r.label || '—';
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

      <AdvancedIdLookup entityLabel="role" value={lookupId} onChange={setLookupId} onLoad={loadRole} />

      {activeId && (
        <FormSection title="Role">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">Role not found.</p>
          ) : (
            <div className="grid gap-2 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">Name:</span> {lookedUp.name ?? '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created role</div>
          <div>ID: {lastCreated.id}</div>
          <div>Name: {lastCreated.name}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Role"
        footer={
          <>
            <Button type="submit" form="role-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Organization">
            <ResourceSelect
              resource={Organizations}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="Name">
            <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_NAMES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Permissions (JSON)">
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
              value={form.permissions}
              onChange={(e) => setForm({ ...form, permissions: e.target.value })}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
