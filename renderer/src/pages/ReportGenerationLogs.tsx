import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ReportGenerationLogs as ReportGenerationLogsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { ReportGenerationLog } from '../types';

export default function ReportGenerationLogs() {
  const [dialogOpen, setDialogOpen] = useState(false);
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
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, body: { status } }, { onSuccess: () => setDialogOpen(false) });
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report Log</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Input value={editing?.report_type ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-status">Status</Label>
              <Input id="log-status" value={status} onChange={(e) => setStatus(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
