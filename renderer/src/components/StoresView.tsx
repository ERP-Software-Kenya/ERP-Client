import { ERPDataTable } from './ERPDataTable';
import { Stores } from '../api';
import type { Store } from '../types';

const COLUMNS = [
  { key: 'id',              label: 'ID',       width: '220px' },
  { key: 'name',            label: 'Name' },
  { key: 'code',            label: 'Code',     width: '120px' },
  { key: 'organization_id', label: 'Org ID',   width: '220px' },
  { key: 'address',         label: 'Address' },
  { key: 'status', label: 'Status', width: '100px',
    render: (row: Store) => (
      <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
];

export function StoresView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<Store>
      title="Stores"
      description="View and manage store locations"
      columns={COLUMNS}
      fetchData={(params) => Stores.search(params as Record<string, string>)}
      isAdmin={isAdmin}
      searchPlaceholder="Search stores…"
    />
  );
}
