import { ERPDataTable } from './ERPDataTable';
import { Products } from '../api';
import type { Product } from '../types';

const COLUMNS = [
  { key: 'id',          label: 'ID',         width: '220px' },
  { key: 'name',        label: 'Name' },
  { key: 'code',        label: 'Code',       width: '120px' },
  { key: 'unit',        label: 'Unit',       width: '80px' },
  { key: 'unit_price',  label: 'Unit Price', width: '120px',
    render: (row: Product) =>
      row.unit_price != null
        ? <span className="mono">₹{Number(row.unit_price).toLocaleString()}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>,
  },
  { key: 'status', label: 'Status', width: '100px',
    render: (row: Product) => (
      <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
];

export function ProductsView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<Product>
      title="Products"
      description="Browse and manage your product catalog"
      columns={COLUMNS}
      fetchData={(params) => Products.search(params as Record<string, string>)}
      isAdmin={isAdmin}
      searchPlaceholder="Search products…"
    />
  );
}
