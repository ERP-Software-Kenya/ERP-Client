import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { DataTable, type Column } from '../../../components/DataTable';
import { DispatchOrders, WarehouseOrderOps } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import type { PackedOrder } from '../../../types';

function PaymentBadge({ row }: { row: PackedOrder }): React.JSX.Element {
  const label = row.paymentLabel ?? 'COD';
  const blocked = row.canDispatch === false;
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-xs font-medium ${
        blocked ? 'bg-amber-500/15 text-amber-700' : 'bg-muted text-muted-foreground'
      }`}>
        {label}
      </span>
      {blocked && row.blockReason && (
        <span className="text-xs text-amber-700">{row.blockReason}</span>
      )}
    </div>
  );
}

function RecordPaymentButton({ row }: { row: PackedOrder }): React.JSX.Element | null {
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);
  const recordPayment = WarehouseOrderOps.useRecordPayment();

  if (row.canDispatch !== false || row.creditApprovalPending) return null;

  const required = row.amountRequired ?? 0;
  const paid = row.amountPaid ?? 0;
  const remaining = Math.max(0, required - paid);

  return (
    <div className="relative">
      <button
        type="button"
        className="text-xs text-primary underline underline-offset-2"
        onClick={() => {
          setAmount(remaining > 0 ? remaining.toFixed(2) : '');
          setOpen((v) => !v);
        }}
      >
        Record payment
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 flex w-48 flex-col gap-2 rounded-md border border-border bg-card p-2 shadow-md">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="h-8 rounded border border-border px-2 text-sm"
          />
          <Button
            size="sm"
            disabled={recordPayment.isPending || !amount || Number(amount) <= 0}
            onClick={() => {
              recordPayment.mutate(
                { orderId: row.id, amount: Number(amount), method: 'CASH' },
                { onSuccess: () => setOpen(false) },
              );
            }}
          >
            {recordPayment.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}

const COLUMNS: Column<PackedOrder>[] = [
  { key: 'orderNumber', label: 'Order #' },
  { key: 'customerName', label: 'Customer' },
  { key: 'deliveryAddress', label: 'Delivery Address' },
  {
    key: 'paymentLabel',
    label: 'Payment',
    render: (row) => <PaymentBadge row={row} />,
  },
  { key: 'pickerName', label: 'Packed By' },
  {
    key: 'packedAt',
    label: 'Packed At',
    render: (row) => new Date(row.packedAt).toLocaleString(),
  },
  { key: 'itemCount', label: 'Items' },
  {
    key: 'id',
    label: '',
    render: (row) => <RecordPaymentButton row={row} />,
  },
];

interface CentrifugoDetail {
  type?: string;
  orderNumber?: string;
  pickerName?: string;
}

export default function DispatchCenter(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PackedOrder[]>([]);
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data, isLoading } = DispatchOrders.useSearch({ page, search: debouncedSearch });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    const handler = (event: Event): void => {
      const detail = (event as CustomEvent<CentrifugoDetail>).detail;
      if (detail?.type === 'order:packed') {
        void queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
        const num = detail.orderNumber ?? '';
        toast(num ? `Order #${num} packed — ready to dispatch` : 'Order packed — ready to dispatch');
      }
    };
    window.addEventListener('centrifugo:publication', handler);
    return () => window.removeEventListener('centrifugo:publication', handler);
  }, [queryClient]);

  const dispatchableSelected = selected.filter((s) => s.canDispatch !== false);

  const checkboxColumn: Column<PackedOrder> = {
    key: 'id',
    label: '',
    width: '40px',
    render: (row) => {
      const blocked = row.canDispatch === false;
      return (
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={blocked}
          title={blocked ? row.blockReason ?? 'Cannot dispatch' : undefined}
          checked={selected.some((s) => s.id === row.id)}
          onChange={(e) => {
            if (blocked) return;
            if (e.target.checked) {
              setSelected((prev) => [...prev, row]);
            } else {
              setSelected((prev) => prev.filter((s) => s.id !== row.id));
            }
          }}
        />
      );
    },
  };

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dispatch Center</h2>
          <p className="text-muted-foreground text-sm">Packed orders ready for driver assignment</p>
        </div>
        <Button
          disabled={dispatchableSelected.length === 0}
          onClick={() => navigate('/fleet/plan-trip', { state: { orders: dispatchableSelected } })}
        >
          <Truck className="mr-2 h-4 w-4" />
          {dispatchableSelected.length > 0
            ? `Plan Trip with ${dispatchableSelected.length} Selected`
            : 'Plan Trip with Selected'}
        </Button>
      </div>
      <DataTable
        title="Packed Orders"
        description="Select orders to group into a delivery trip. Prepaid/deposit orders must be paid before dispatch."
        columns={[checkboxColumn, ...COLUMNS]}
        rows={rows}
        total={total}
        page={page}
        loading={isLoading}
        onPageChange={setPage}
        onSearchChange={setSearch}
        searchPlaceholder="Search orders…"
      />
    </div>
  );
}
