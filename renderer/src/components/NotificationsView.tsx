import { ERPDataTable } from './ERPDataTable';
import { Notifications } from '../api';
import type { Notification } from '../types';

const TYPE_CLASS: Record<string, string> = {
  info:    'badge-info',
  warning: 'badge-warning',
  error:   'badge-danger',
  success: 'badge-success',
};

const COLUMNS = [
  { key: 'id',      label: 'ID',      width: '220px' },
  { key: 'title',   label: 'Title' },
  { key: 'message', label: 'Message' },
  { key: 'type', label: 'Type', width: '100px',
    render: (row: Notification) => (
      <span className={`badge ${TYPE_CLASS[row.type ?? ''] ?? 'badge-neutral'}`}>
        {row.type ?? '—'}
      </span>
    ),
  },
  { key: 'read', label: 'Read', width: '80px',
    render: (row: Notification) => (
      <span className={`badge ${row.read ? 'badge-neutral' : 'badge-info'}`}>
        {row.read ? 'Read' : 'Unread'}
      </span>
    ),
  },
  { key: 'created_at', label: 'Date', width: '160px',
    render: (row: Notification) =>
      row.created_at ? new Date(row.created_at).toLocaleString() : '—',
  },
];

export function NotificationsView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<Notification>
      title="Notifications"
      description="System notifications and alerts"
      columns={COLUMNS}
      fetchData={(params) => Notifications.search(params as Record<string, string>)}
      isAdmin={isAdmin}
      searchPlaceholder="Search notifications…"
    />
  );
}
