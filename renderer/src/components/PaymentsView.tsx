import { ERPDataTable } from './ERPDataTable';
import { PaymentTransactions } from '../api';
import type { PaymentTransaction } from '../types';

const STATUS_CLASS: Record<string, string> = {
  completed: 'badge-success',
  pending:   'badge-warning',
  failed:    'badge-danger',
  refunded:  'badge-info',
};

const COLUMNS = [
  { key: 'id',        label: 'ID',         width: '220px' },
  { key: 'reference', label: 'Reference',  width: '180px' },
  { key: 'type',      label: 'Type',       width: '100px' },
  { key: 'amount', label: 'Amount', width: '130px',
    render: (row: PaymentTransaction) =>
      row.amount != null ? <span className="mono">₹{Number(row.amount).toLocaleString()}</span> : '—',
  },
  { key: 'status', label: 'Status', width: '110px',
    render: (row: PaymentTransaction) => (
      <span className={`badge ${STATUS_CLASS[row.status ?? ''] ?? 'badge-neutral'}`}>
        {row.status ?? '—'}
      </span>
    ),
  },
  { key: 'created_at', label: 'Date', width: '160px',
    render: (row: PaymentTransaction) =>
      row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
  },
];

export function PaymentsView({ isAdmin }: { isAdmin: boolean }) {
  return (
    <ERPDataTable<PaymentTransaction>
      title="Payment Transactions"
      description="View all payment transactions"
      columns={COLUMNS}
      fetchData={(params) => PaymentTransactions.search(params as Record<string, string>)}
      queryKey="payments"
      isAdmin={isAdmin}
      searchPlaceholder="Search payments…"
    />
  );
}
