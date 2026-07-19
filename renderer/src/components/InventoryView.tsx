import { ERPDataTable } from './ERPDataTable';
import { Inventory } from '../api';
import type { InventoryItem } from '../types';

const COLUMNS = [
  { key: 'id',           label: 'ID',         width: '220px' },
  { key: 'product_id',   label: 'Product ID', width: '220px' },
  { key: 'store_id',     label: 'Store ID',   width: '220px' },
  { key: 'quantity', label: 'Quantity', width: '100px',
    render: (row: InventoryItem) => (
      <span className={`mono ${(row.quantity ?? 0) < (row.min_quantity ?? 0) ? 'badge badge-danger' : ''}`}>
        {row.quantity ?? '—'}
      </span>
    ),
  },
  { key: 'min_quantity', label: 'Min Qty',    width: '90px',
    render: (row: InventoryItem) => <span className="mono">{row.min_quantity ?? '—'}</span>,
  },
  { key: 'unit',         label: 'Unit',       width: '80px' },
  { key: 'status', label: 'Status', width: '100px',
    render: (row: InventoryItem) => (
      <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
];

export function InventoryView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<InventoryItem>
      title="Inventory"
      description="Track stock levels across all stores"
      columns={COLUMNS}
      fetchData={(params) => Inventory.search(params as Record<string, string>)}
      isAdmin={isAdmin}
      searchPlaceholder="Search inventory…"
    />
  );
}
