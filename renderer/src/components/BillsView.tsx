import { ERPDataTable } from './ERPDataTable';
import { Bills } from '../api';
import type { Bill } from '../types';

const STATUS_CLASS: Record<string, string> = { paid: 'badge-success', unpaid: 'badge-warning', overdue: 'badge-danger' };

const COLUMNS = [
  { key: 'id',                 label: 'ID',             width: '220px' },
  { key: 'purchase_order_id',  label: 'PO ID',          width: '220px' },
  { key: 'amount', label: 'Amount', width: '120px',
    render: (row: Bill) =>
      row.amount != null ? <span className="mono">₹{Number(row.amount).toLocaleString()}</span> : '—',
  },
  { key: 'due_date', label: 'Due Date', width: '140px',
    render: (row: Bill) => row.due_date ? new Date(row.due_date).toLocaleDateString() : '—',
  },
  { key: 'status', label: 'Status', width: '100px',
    render: (row: Bill) => (
      <span className={`badge ${STATUS_CLASS[row.status ?? ''] ?? 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
];

export function BillsView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<Bill>
      title="Bills"
      description="Track bills and payment obligations"
      columns={COLUMNS}
      fetchData={(params) => Bills.search(params as Record<string, string>)}
      queryKey="bills"
      isAdmin={isAdmin}
      searchPlaceholder="Search bills…"
    />
  );
}
