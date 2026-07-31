import { useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ActivityLogs } from '../api';

/**
 * Audit Log — get-by-id only until Core API adds GET /activity-logs list/search
 * (see docs/core-apis-fixes.md P1). Demo rows removed so this never looks like live history.
 */
export default function AuditLog() {
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const { data: lookedUp, isLoading, error } = ActivityLogs.useGet(activeId);

  const loadLookup = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter an activity log UUID');
      return;
    }
    setActiveId(trimmed);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Look up a single activity log by UUID. A searchable directory needs a list endpoint from
            Core API.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/activity-logs">Create / manage logs</Link>
        </Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        No <code className="text-xs">GET /api/v1/activity-logs</code> list/search yet — see{' '}
        <code className="text-xs">docs/core-apis-fixes.md</code> (P1). This page only supports
        get-by-id.
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1 min-w-[280px] flex-1">
          <label className="text-xs text-muted-foreground">Activity log UUID</label>
          <Input
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="Paste activity log id"
            onKeyDown={(e) => e.key === 'Enter' && loadLookup()}
          />
        </div>
        <Button type="button" onClick={loadLookup} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Look up'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Lookup failed'}</p>
      )}

      {lookedUp && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
          <h2 className="font-medium">Entry</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {(
              [
                ['ID', lookedUp.id],
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
    </div>
  );
}
