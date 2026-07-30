import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ReportGenerationLogs as ReportGenerationLogsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { ReportGenerationLog } from '../types';

export default function ReportGenerationLogs() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ReportGenerationLog | null>(null);
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReportGenerationLog | null>(null);

  const { updateMutation, removeMutation } = useResourceMutations(
    ReportGenerationLogsApi,
    'report-generation-logs',
    'Report log',
  );

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
    { key: 'created_at', label: 'Created' },
  ];

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Report Generation Logs"
        description="System-generated report job logs. Update status or delete."
        queryKey="report-generation-logs"
        columns={columns}
        fetchData={(params) => ReportGenerationLogsApi.search(params)}
        searchPlaceholder="Search report logs…"
        isAdmin={true}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
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
