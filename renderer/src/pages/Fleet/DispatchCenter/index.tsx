import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { DataTable, type Column } from '../../../components/DataTable';
import { DispatchOrders } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import type { PackedOrder } from '../../../types';

const COLUMNS: Column<PackedOrder>[] = [
  { key: 'orderNumber', label: 'Order #' },
  { key: 'customerName', label: 'Customer' },
  { key: 'deliveryAddress', label: 'Delivery Address' },
  { key: 'pickerName', label: 'Packed By' },
  {
    key: 'packedAt',
    label: 'Packed At',
    render: (row) => new Date(row.packedAt).toLocaleString(),
  },
  { key: 'itemCount', label: 'Items' },
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

  const checkboxColumn: Column<PackedOrder> = {
    key: 'id',
    label: '',
    width: '40px',
    render: (row) => (
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-primary"
        checked={selected.some((s) => s.id === row.id)}
        onChange={(e) => {
          if (e.target.checked) {
            setSelected((prev) => [...prev, row]);
          } else {
            setSelected((prev) => prev.filter((s) => s.id !== row.id));
          }
        }}
      />
    ),
  };

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dispatch Center</h2>
          <p className="text-muted-foreground text-sm">Packed orders ready for driver assignment</p>
        </div>
        <Button
          disabled={selected.length === 0}
          onClick={() => navigate('/fleet/plan-trip', { state: { orders: selected } })}
        >
          <Truck className="mr-2 h-4 w-4" />
          {selected.length > 0
            ? `Plan Trip with ${selected.length} Selected`
            : 'Plan Trip with Selected'}
        </Button>
      </div>
      <DataTable
        title="Packed Orders"
        description="Select orders to group into a delivery trip"
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
