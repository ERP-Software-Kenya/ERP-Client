import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { RecentRecords } from '../components/RecentRecords';
import { Button } from '../components/ui/button';
import { FormSection } from '../components/FormDrawer';
import { ActivityLogs, get } from '../api';
import { formatEntityLabel } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { ActivityLog } from '../types';

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

/**
 * Audit Log — get-by-id only until Core API adds GET /activity-logs list/search
 * (see docs/core-apis-fixes.md P1). Demo rows removed so this never looks like live history.
 */
export default function AuditLog() {
  const recent = useRecentIds(RECENT_NS.activityLogs);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const { data: lookedUp, isLoading, error } = ActivityLogs.useGet(activeId);

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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Reopen recent activity logs saved in this browser, or load one by ID. A searchable
            directory needs a list endpoint from Core API.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/activity-logs">Create / manage logs</Link>
        </Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        No <code className="text-xs">GET /api/v1/activity-logs</code> list/search yet — see{' '}
        <code className="text-xs">docs/core-apis-fixes.md</code> (P1). Use Recent or Advanced load
        by ID until then.
      </div>

      <RecentRecords
        title="Recent activity logs"
        emptyHint="No recent logs in this browser. Create one on Activity Logs or use Advanced load by ID."
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
        <FormSection title="Entry">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !lookedUp ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Lookup failed'}
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {(
                  [
                    ['Organization', lookedUp.organizationId],
                    ['User', lookedUp.userId],
                    ['Action', lookedUp.action],
                    ['Entity', lookedUp.entityName],
                    ['Entity ID', lookedUp.entityId],
                    ['Created', lookedUp.createdAt],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-mono text-xs break-all">{value ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </FormSection>
      )}
    </div>
  );
}
