import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable, type Column } from '../../components/DataTable';
import { Button } from '../../components/ui/button';
import { FormSelect } from '../../components/FormSelect';
import { Customers, Locations, Orders } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import type { FulfillmentMode, Order } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  packed: 'Packed',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function money(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OrdersListPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<FulfillmentMode | 'ALL'>('ALL');
  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const { data: locations = [] } = Locations.useList();
  const { data: customersPage } = Customers.useSearch({});
  const customers = customersPage?.items ?? [];

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (modeFilter !== 'ALL') f.fulfillmentMode = modeFilter;
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, modeFilter]);

  const { data, isLoading } = Orders.useSearch({ page, search: debouncedSearch, filters });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const locationName = useMemo(
    () => new Map(locations.map((l) => [l.id, l.name ?? l.id.slice(0, 8)])),
    [locations],
  );
  const customerName = useMemo(
    () => new Map(customers.map((c) => [c.id, c.name ?? c.id.slice(0, 8)])),
    [customers],
  );

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      label: 'Order #',
      render: (row) => row.orderNumber ?? row.id.slice(0, 8).toUpperCase(),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'customerId',
      label: 'Customer',
      render: (row) => (row.customerId ? customerName.get(row.customerId) ?? '—' : '—'),
    },
    {
      key: 'fulfillmentMode',
      label: 'Mode',
      render: (row) => (row.fulfillmentMode === 'pickup' ? 'Pickup' : 'Delivery'),
    },
    {
      key: 'fulfillmentLocationId',
      label: 'Fulfillment',
      render: (row) => locationName.get(row.fulfillmentLocationId ?? row.locationId ?? '') ?? '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => STATUS_LABELS[row.status ?? ''] ?? row.status ?? '—',
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row) => money(row.totalAmount),
    },
  ];

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Sales Orders</h2>
          <p className="text-sm text-muted-foreground">Delivery and pickup orders awaiting fulfillment</p>
        </div>
        <Button onClick={() => navigate('/orders/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Sales Order
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px]">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Status</p>
          <FormSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'ALL', label: 'All statuses' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'packed', label: 'Packed' },
            { value: 'in_transit', label: 'In transit' },
            { value: 'delivered', label: 'Delivered' },
          ]} />
        </div>
        <div className="min-w-[160px]">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Fulfillment</p>
          <FormSelect value={modeFilter} onChange={(v) => setModeFilter(v as FulfillmentMode | 'ALL')} options={[
            { value: 'ALL', label: 'All modes' },
            { value: 'delivery', label: 'Delivery' },
            { value: 'pickup', label: 'Pickup' },
          ]} />
        </div>
      </div>

      <DataTable
        title="Orders"
        description="Track bulk and scheduled customer orders"
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        loading={isLoading}
        onPageChange={setPage}
        onSearchChange={setSearch}
        searchPlaceholder="Search order # or customer…"
        footerNote={rows.length === 0 ? 'No sales orders yet. Create one for delivery or pickup.' : undefined}
      />
    </div>
  );
}
