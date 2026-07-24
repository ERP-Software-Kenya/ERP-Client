import { useState } from 'react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Notifications as NotificationsApi } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Notification } from '../types';

export default function Notifications() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  // create is intentionally unused here — no Add form for this system-generated resource.
  const { updateMutation, removeMutation } = useResourceMutations(NotificationsApi, 'notifications', 'Notification');

  const openEdit = (row: Notification) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const toggleRead = () => {
    if (!editing) return;
    updateMutation.mutate(
      { id: editing.id, body: { read: !editing.read } },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  const columns: Column<Notification>[] = [
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'type', label: 'Type' },
    { key: 'read', label: 'Read', render: (row) => (row.read ? 'Yes' : 'No') },
    { key: 'created_at', label: 'Created' },
  ];

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Notifications"
        description="System-generated notifications. Mark as read or delete."
        queryKey="notifications"
        columns={columns}
        fetchData={(params) => NotificationsApi.search(params)}
        searchPlaceholder="Search notifications…"
        isAdmin={true}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.title ?? 'Notification'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{editing?.message}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={toggleRead} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : editing?.read ? 'Mark as Unread' : 'Mark as Read'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
