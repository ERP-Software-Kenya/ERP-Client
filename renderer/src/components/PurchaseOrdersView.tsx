import { ERPDataTable } from './ERPDataTable';
import { PurchaseOrders } from '../api';
import type { PurchaseOrder } from '../types';

const STATUS_CLASS: Record<string, string> = {
  pending:   'badge-warning',
  approved:  'badge-info',
  received:  'badge-success',
  cancelled: 'badge-danger',
};

const COLUMNS = [
  { key: 'id',            label: 'ID',          width: '220px' },
  { key: 'supplier_id',   label: 'Supplier ID', width: '220px' },
  { key: 'store_id',      label: 'Store ID',    width: '220px' },
  { key: 'total_amount',  label: 'Total',       width: '120px',
    render: (row: PurchaseOrder) =>
      row.total_amount != null
        ? <span className="mono">₹{Number(row.total_amount).toLocaleString()}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>,
  },
  { key: 'status', label: 'Status', width: '100px',
    render: (row: PurchaseOrder) => (
      <span className={`badge ${STATUS_CLASS[row.status ?? ''] ?? 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
  { key: 'ordered_at', label: 'Ordered At', width: '180px',
    render: (row: PurchaseOrder) =>
      row.ordered_at ? new Date(row.ordered_at).toLocaleDateString() : '—',
  },
];

export function PurchaseOrdersView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<PurchaseOrder>
      title="Purchase Orders"
      description="Track and manage purchase orders"
      columns={COLUMNS}
      fetchData={(params) => PurchaseOrders.search(params as Record<string, string>)}
      queryKey="purchase-orders"
      isAdmin={isAdmin}
      searchPlaceholder="Search purchase orders…"
    />
  );
}
