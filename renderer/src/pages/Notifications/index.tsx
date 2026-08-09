import { useState } from 'react';
import { DataTable, Column } from '../../components/DataTable';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/ui/button';
import { Notifications } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { Notification } from '../../types';

export default function NotificationsPage() {
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  const markReadMutation = Notifications.useMarkRead();
  const markAllReadMutation = Notifications.useMarkAllRead();
  const removeMutation = Notifications.useDelete();
  const { page, setPage } = usePagination();
  const { data, isLoading, error, refetch } = Notifications.useSearch({ page });

  const columns: Column<Notification>[] = [
    { key: 'title', label: 'Title' },
    { key: 'body', label: 'Message' },
    { key: 'type', label: 'Type' },
    {
      key: 'readAt',
      label: 'Status',
      render: (row) => row.readAt ? (
        <span className="text-xs text-muted-foreground">Read</span>
      ) : (
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
          Unread
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Received',
      render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : '—',
    },
  ];

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          Mark all as read
        </Button>
      </div>

      <DataTable
        title="Notifications"
        description="System-generated notifications. Click a row to mark it as read."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        hideSearch
        onRefetch={() => void refetch()}
        isAdmin={true}
        onEdit={(row) => { if (!row.readAt) markReadMutation.mutate(row.id); }}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Notification"
        description="Delete this notification? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
