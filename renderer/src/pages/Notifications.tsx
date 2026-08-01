import { useState } from 'react';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { Button } from '../components/ui/button';
import { Notifications } from '../api';
import { usePagination } from '../hooks/usePagination';
import type { Notification } from '../types';

export default function NotificationsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [viewRow, setViewRow] = useState<Notification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  const updateMutation = Notifications.useUpdate();
  const removeMutation = Notifications.useDelete();
  const { page, setPage } = usePagination();
  const { data, isLoading, error, refetch } = Notifications.useSearch({ page });

  const openEdit = (row: Notification) => {
    setEditing(row);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const toggleRead = () => {
    if (!editing) return;
    updateMutation.mutate(
      { id: editing.id, body: { read: !editing.read } },
      { onSuccess: closeDrawer },
    );
  };

  const columns: Column<Notification>[] = [
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'type', label: 'Type' },
    { key: 'read', label: 'Read', render: (row) => (row.read ? 'Yes' : 'No') },
    { key: 'created_at', label: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '—' },
  ];

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <p className="text-xs text-muted-foreground">
        API gap: no free-text search; org filter omitted (Core <code className="text-[10px]">orgId</code> ≠
        entity <code className="text-[10px]">organizationId</code>). Type filter deferred (no shared enum).
      </p>
      <DataTable
        title="Notifications"
        description="System-generated notifications. Mark as read or delete."
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
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Notification"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing?.title ?? 'Notification'}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Close
            </Button>
            <Button type="button" onClick={toggleRead} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : editing?.read ? 'Mark as Unread' : 'Mark as Read'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{editing?.message}</p>
      </FormDrawer>

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
