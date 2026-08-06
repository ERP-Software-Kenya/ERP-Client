import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../../components/AdvancedIdLookup';
import { FormDrawer, Field, FormSection } from '../../components/FormDrawer';
import { RecentRecords } from '../../components/RecentRecords';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ResourceSelect } from '../../components/ResourceSelect';
import { ActivityLogs, Organizations, get } from '../../api';
import { formatEntityLabel } from '../../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../../lib/recentIds';
import { ACTIVITY_LOG_ACTIONS, type ActivityLog } from '../../types';

interface FormState {
  organizationId: string;
  userId: string;
  action: string;
  entityName: string;
  entityId: string;
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  userId: '',
  action: ACTIVITY_LOG_ACTIONS[0],
  entityName: '',
  entityId: '',
};

function activityLabel(log: Pick<ActivityLog, 'id' | 'action' | 'createdAt'>) {
  const action = log.action?.trim();
  const when = log.createdAt ? new Date(log.createdAt).toLocaleDateString() : undefined;
  if (action && when) return `${action} · ${when}`;
  if (action) return action;
  if (when) return when;
  return formatEntityLabel({ id: log.id });
}

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

export default function ActivityLogsPage() {
  const recent = useRecentIds(RECENT_NS.activityLogs);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<ActivityLog | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const createMutation = ActivityLogs.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = ActivityLogs.useGet(activeId);

  const closeDrawer = () => setDrawerOpen(false);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['activity-logs', e.id] as const,
      queryFn: () => get<ActivityLog>(`/api/v1/activity-logs/${e.id}`),
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
          action: data?.action,
          createdAt: data?.createdAt,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = lookedUp;
    if (!loaded || loaded.id !== activeId) return;
    recent.push(loaded.id, activityLabel(loaded));
  }, [activeId, lookedUp, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter an activity log ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadLookup = () => loadById(lookupId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        organizationId: form.organizationId || undefined,
        userId: form.userId || undefined,
        action: form.action,
        entityName: form.entityName || undefined,
        entityId: form.entityId || undefined,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          recent.push(created.id, activityLabel(created));
          setDrawerOpen(false);
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activity Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create activity logs and reopen recent ones saved in this browser.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Activity Log</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        API gap: no list/search directory — use Recent, create, or Advanced load by ID.
      </p>

      <RecentRecords
        title="Recent activity logs"
        emptyHint="No recent activity logs yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'action',
            header: 'Action',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return r.label?.trim() || 'unavailable';
              return r.action || r.label || '—';
            },
          },
          {
            key: 'when',
            header: 'When',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return 'unavailable';
              return r.createdAt ? new Date(r.createdAt).toLocaleString() : '—';
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
        entityLabel="activity log"
        value={lookupId}
        onChange={setLookupId}
        onLoad={loadLookup}
      />

      {activeId && (
        <FormSection title="Activity log">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">Activity log not found.</p>
          ) : (
            <div className="grid gap-2 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">Action:</span> {lookedUp.action ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Entity:</span> {lookedUp.entityName ?? '—'} /{' '}
                {lookedUp.entityId ?? '—'}
              </p>
              {lookedUp.createdAt ? (
                <p>
                  <span className="text-muted-foreground">Created:</span>{' '}
                  {new Date(lookedUp.createdAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created activity log</div>
          <div>{activityLabel(lastCreated)}</div>
          <div className="flex flex-wrap items-center gap-2">
            ID: {lastCreated.id}
            <Button type="button" variant="outline" size="sm" onClick={() => copyId(lastCreated.id)}>
              Copy
            </Button>
          </div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Activity Log"
        footer={
          <>
            <Button type="submit" form="activity-log-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="activity-log-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Organization">
            <ResourceSelect
              resource={Organizations}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="User ID (optional)">
            <Input
              placeholder="User record ID — no user directory exists to pick from"
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
            />
          </Field>
          <Field label="Action">
            <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LOG_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Entity Name" required>
            <Input
              placeholder="e.g. Product, PurchaseOrder"
              value={form.entityName}
              onChange={(e) => setForm({ ...form, entityName: e.target.value })}
              required
            />
          </Field>
          <Field label="Entity ID" required>
            <Input
              placeholder="ID of the affected record"
              value={form.entityId}
              onChange={(e) => setForm({ ...form, entityId: e.target.value })}
              required
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
