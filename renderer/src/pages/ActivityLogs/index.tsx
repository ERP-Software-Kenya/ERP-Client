import { useState } from 'react';
import { Activity, Clock, Copy, Download, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/DataTable';
import { FormDrawer, FormSection } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useActivityLogs, exportActivityLogsPdf } from '../../api';
import { loadErrorMessage } from '../../lib/api-error';
import { ACTIVITY_LOG_ACTIONS, type ActivityLog, type ActivityLogFilters } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionLabel(action: string): string {
  const [mod, verb] = action.split('.');
  if (!verb) return action;
  return `${verb.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;
}

function moduleLabel(action?: string): string {
  if (!action) return '—';
  const mod = action.split('.')[0] ?? '';
  return mod.charAt(0).toUpperCase() + mod.slice(1).replace(/_/g, ' ');
}

function formatTime(dateStr?: string): { relative: string; full: string } {
  if (!dateStr) return { relative: '—', full: '—' };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { relative: '—', full: '—' };
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  let relative = '';
  if (diffMin < 1) relative = 'Just now';
  else if (diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffMin < 1440) relative = `${Math.floor(diffMin / 60)}h ago`;
  else relative = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return { relative, full: d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
}

function copyText(text: string, label: string): void {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(label),
    () => toast.error('Failed to copy'),
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EventBadge({ action }: { action?: string }): React.JSX.Element {
  if (!action) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-muted text-foreground">
      <Activity size={11} />
      {actionLabel(action)}
    </span>
  );
}

interface EventFilterProps {
  selected: string[];
  onChange: (actions: string[]) => void;
}

function EventTypeFilter({ selected, onChange }: EventFilterProps): React.JSX.Element {
  const toggle = (action: string): void => {
    onChange(selected.includes(action) ? selected.filter((a) => a !== action) : [...selected, action]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter size={13} />
          Event Type
          {selected.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold w-4 h-4">
              {selected.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 overflow-y-auto w-52">
        {(Object.entries(ACTIVITY_LOG_ACTIONS) as [string, readonly string[]][]).map(([group, actions], idx) => (
          <div key={group}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{group}</DropdownMenuLabel>
            {actions.map((action) => (
              <DropdownMenuCheckboxItem
                key={action}
                checked={selected.includes(action)}
                onCheckedChange={() => toggle(action)}
              >
                {actionLabel(action)}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ChipsProps {
  filters: ActivityLogFilters;
  onClearAction: (action: string) => void;
  onClearDate: () => void;
}

function ActiveFilterChips({ filters, onClearAction, onClearDate }: ChipsProps): React.JSX.Element | null {
  const hasActions = (filters.action?.length ?? 0) > 0;
  const hasDate = filters.dateFrom || filters.dateTo;
  if (!hasActions && !hasDate) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2">
      {filters.action?.map((a) => (
        <span key={a} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
          {actionLabel(a)}
          <button type="button" onClick={() => onClearAction(a)} className="hover:bg-primary/20 rounded-full p-0.5">
            <X size={10} />
          </button>
        </span>
      ))}
      {hasDate && (
        <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
          {filters.dateFrom ?? '…'} → {filters.dateTo ?? '…'}
          <button type="button" onClick={onClearDate} className="hover:bg-primary/20 rounded-full p-0.5">
            <X size={10} />
          </button>
        </span>
      )}
    </div>
  );
}

interface DetailDrawerProps {
  log: ActivityLog | null;
  onClose: () => void;
}

function ActivityDetailDrawer({ log, onClose }: DetailDrawerProps): React.JSX.Element {
  if (!log) return <></>;
  const time = formatTime(log.createdAt);

  return (
    <FormDrawer open={Boolean(log)} onClose={onClose} title="Activity Details" footer={
      <Button type="button" variant="outline" onClick={onClose}>Close</Button>
    }>
      <div className="space-y-5 text-sm">
        <FormSection title="Event">
          <div className="space-y-3">
            <Row label="Action"><EventBadge action={log.action} /></Row>
            <Row label="Module"><span className="text-foreground font-medium">{moduleLabel(log.action)}</span></Row>
            <Row label="When"><span className="text-foreground font-medium" title={time.full}>{time.full}</span></Row>
          </div>
        </FormSection>
        <FormSection title="Record">
          <div className="space-y-3">
            <Row label="Entity Type"><span className="text-foreground">{log.entityType ?? '—'}</span></Row>
            {log.entityId && (
              <Row label="Entity ID">
                <button type="button" className="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  onClick={() => copyText(log.entityId!, 'ID copied')}>
                  {log.entityId.slice(0, 8)}… <Copy size={10} />
                </button>
              </Row>
            )}
          </div>
        </FormSection>
        <FormSection title="Performed By">
          <div className="space-y-3">
            <Row label="Name"><span className="text-foreground font-medium">{log.actorName ?? 'System'}</span></Row>
            {log.ipAddress && <Row label="IP"><span className="font-mono text-xs text-muted-foreground">{log.ipAddress}</span></Row>}
          </div>
        </FormSection>
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <FormSection title="Metadata">
            <pre className="text-[11px] bg-muted/50 rounded p-2 overflow-auto max-h-40 border border-border">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </FormSection>
        )}
      </div>
    </FormDrawer>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}:</span>
      <div>{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const COLUMNS: Column<ActivityLog>[] = [
  {
    key: 'createdAt',
    label: 'When',
    width: '140px',
    render: (r) => {
      const t = formatTime(r.createdAt);
      return (
        <div className="flex items-center gap-1.5" title={t.full}>
          <Clock size={12} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-medium">{t.relative}</span>
        </div>
      );
    },
  },
  {
    key: 'action',
    label: 'Event',
    render: (r) => <EventBadge action={r.action} />,
  },
  {
    key: 'entityType',
    label: 'Module',
    render: (r) => <span className="text-xs text-muted-foreground">{moduleLabel(r.action)}</span>,
  },
  {
    key: 'entityId',
    label: 'Affected Record',
    render: (r) => (
      <span className="text-xs text-foreground">{r.entityType ?? '—'}{r.entityId ? ` · ${r.entityId.slice(0, 8)}…` : ''}</span>
    ),
  },
  {
    key: 'actorName',
    label: 'Performed By',
    render: (r) => <span className="text-xs text-muted-foreground">{r.actorName ?? 'System'}</span>,
  },
];

export default function ActivityLogsPage(): React.JSX.Element {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters: ActivityLogFilters = {
    action: selectedActions.length > 0 ? selectedActions : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 50,
  };

  const { data, isLoading, error, refetch } = useActivityLogs(filters);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const { blob, filename } = await exportActivityLogsPdf(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toolbar = (
    <div className="flex items-center gap-2">
      <EventTypeFilter selected={selectedActions} onChange={(a) => { setSelectedActions(a); setPage(1); }} />
      <Input type="date" className="h-8 w-36 text-xs" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
      <span className="text-muted-foreground text-xs">→</span>
      <Input type="date" className="h-8 w-36 text-xs" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
      <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting || total === 0} onClick={() => void handleExport()}>
        <Download size={13} />
        {exporting ? 'Exporting…' : 'Export PDF'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-0">
      <DataTable<ActivityLog>
        title="Activity Logs"
        description="Automatic record of all operational actions across your organisation."
        columns={COLUMNS}
        rows={rows}
        total={total}
        page={page}
        loading={isLoading}
        error={error ? loadErrorMessage(error, 'activity logs') : null}
        onPageChange={setPage}
        hideSearch
        limit={50}
        toolbar={toolbar}
        onRefetch={() => void refetch()}
        onView={(row) => setSelectedLog(row)}
        emptyState={
          <div className="py-12 text-center">
            <Activity className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-semibold">No activity logs yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Actions will appear here automatically as your team uses the ERP.</p>
          </div>
        }
      />
      <ActiveFilterChips
        filters={filters}
        onClearAction={(a) => { setSelectedActions((prev) => prev.filter((x) => x !== a)); setPage(1); }}
        onClearDate={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
      />
      <ActivityDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
