import { useMemo, useState } from 'react';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ReportGenerationLogs } from '../api';
import { usePagination } from '../hooks/usePagination';
import type { ReportGenerationLog } from '../types';

const STATUS_FILTERS = ['ALL', 'PENDING', 'COMPLETED', 'FAILED'] as const;

export default function ReportGenerationLogsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ReportGenerationLog | null>(null);
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReportGenerationLog | null>(null);
  const [viewRow, setViewRow] = useState<ReportGenerationLog | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');

  const updateMutation = ReportGenerationLogs.useUpdate();
  const removeMutation = ReportGenerationLogs.useDelete();
  const { page, setPage } = usePagination();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (statusFilter !== 'ALL') next.status = statusFilter;
    return Object.keys(next).length ? next : undefined;
  }, [statusFilter]);

  const { data, isLoading, error, refetch } = ReportGenerationLogs.useSearch({ page, filters });

  const openEdit = (row: ReportGenerationLog) => {
    setEditing(row);
    setStatus(row.status ?? '');
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, body: { status } }, { onSuccess: closeDrawer });
  };

  const columns: Column<ReportGenerationLog>[] = [
    { key: 'report_type', label: 'Report Type' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '—' },
  ];

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <p className="text-xs text-muted-foreground">
        API gap: no free-text search; org filter omitted (Core <code className="text-[10px]">orgId</code> ≠
        entity <code className="text-[10px]">organizationId</code>). Status filter only.
      </p>
      <DataTable
        title="Report Generation Logs"
        description="System-generated report job logs. Update status or delete."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        hideSearch
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {s === 'ALL' ? 'All' : s}
              </Button>
            ))}
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Report Log"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Edit Report Log"
        footer={
          <>
            <Button type="submit" form="report-log-form" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="report-log-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Report Type">
            <Input value={editing?.report_type ?? ''} disabled />
          </Field>
          <Field label="Status">
            <Input value={status} onChange={(e) => setStatus(e.target.value)} autoFocus />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Report Log"
        description="Delete this report log? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
