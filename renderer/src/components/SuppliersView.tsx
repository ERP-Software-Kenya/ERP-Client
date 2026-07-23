import { ERPDataTable } from './ERPDataTable';
import { Suppliers } from '../api';
import type { Supplier } from '../types';

const COLUMNS = [
  { key: 'id',      label: 'ID',      width: '220px' },
  { key: 'name',    label: 'Name' },
  { key: 'code',    label: 'Code',    width: '100px' },
  { key: 'email',   label: 'Email',   width: '200px' },
  { key: 'phone',   label: 'Phone',   width: '140px' },
  { key: 'status',  label: 'Status',  width: '100px',
    render: (row: Supplier) => (
      <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
];

export function SuppliersView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<Supplier>
      title="Suppliers"
      description="Manage your supplier network"
      columns={COLUMNS}
      fetchData={(params) => Suppliers.search(params as Record<string, string>)}
      queryKey="suppliers"
      isAdmin={isAdmin}
      searchPlaceholder="Search suppliers…"
    />
  );
}
