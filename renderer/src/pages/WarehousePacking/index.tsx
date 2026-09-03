import { useEffect, useMemo, useState } from 'react';
import { Package, PackageCheck, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Customers, Locations, Products, WarehouseOrderOps } from '../../api';
import { DataTable, type Column } from '../../components/DataTable';
import { FormDrawer } from '../../components/FormDrawer';
import { FormSelect } from '../../components/FormSelect';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { usePagination } from '../../hooks/usePagination';
import type { Order, OrderQueueItem, PackedOrder } from '../../types';

type Tab = 'to-pack' | 'ready-for-pickup';

function money(n: number | undefined | null): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function formatWhen(d: string | Date | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function WarehousePackingPage(): React.JSX.Element {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('to-pack');
  const [locationId, setLocationId] = useState('');
  const [packOrderId, setPackOrderId] = useState<string | null>(null);
  const [packing, setPacking] = useState(false);

  const { page, setPage, setSearch, debouncedSearch } = usePagination();

  const { data: locations = [] } = Locations.useList();
  const { data: customersPage } = Customers.useSearch({});
  const { data: products = [] } = Products.useList();
  const customers = customersPage?.items ?? [];

  const { data: queue = [], isLoading: queueLoading, refetch: refetchQueue } = WarehouseOrderOps.useQueue(locationId || undefined);
  const { data: pickupData, isLoading: pickupLoading } = WarehouseOrderOps.useReadyForPickup(
    locationId || undefined,
    page,
    debouncedSearch,
  );
  const { data: packOrder } = WarehouseOrderOps.useGetWarehouseOrder(packOrderId ?? undefined);

  const claimMutation = WarehouseOrderOps.useClaim();
  const packMutation = WarehouseOrderOps.usePack();
  const pickupMutation = WarehouseOrderOps.usePickupComplete();

  useEffect(() => {
    if (!locationId && locations.length > 0) {
      const warehouse = locations.find((l) => l.type === 'warehouse') ?? locations[0];
      setLocationId(warehouse.id);
    }
  }, [locations, locationId]);

  const customerName = useMemo(
    () => new Map(customers.map((c) => [c.id, c.name ?? c.id.slice(0, 8)])),
    [customers],
  );
  const productName = useMemo(
    () => new Map(products.map((p) => [p.id, p.name ?? p.sku ?? p.id.slice(0, 8)])),
    [products],
  );

  const queueColumns: Column<OrderQueueItem>[] = [
    { key: 'orderNumber', label: 'Order #' },
    {
      key: 'customerId',
      label: 'Customer',
      render: (row) => customerName.get(row.customerId) ?? '—',
    },
    {
      key: 'fulfillmentMode',
      label: 'Mode',
      render: (row) => (row.fulfillmentMode === 'pickup' ? 'Pickup' : 'Delivery'),
    },
    { key: 'totalAmount', label: 'Total', render: (row) => money(row.totalAmount) },
    { key: 'createdAt', label: 'Created', render: (row) => formatWhen(row.createdAt) },
    {
      key: 'id',
      label: '',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          disabled={!user?.id || claimMutation.isPending}
          onClick={() => void handleClaimAndPack(row.id)}
        >
          Claim & Pack
        </Button>
      ),
    },
  ];

  const pickupColumns: Column<PackedOrder>[] = [
    { key: 'orderNumber', label: 'Order #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'itemCount', label: 'Items' },
    { key: 'pickerName', label: 'Packed By' },
    { key: 'packedAt', label: 'Packed', render: (row) => formatWhen(row.packedAt) },
    {
      key: 'id',
      label: '',
      render: (row) => (
        <Button
          size="sm"
          disabled={pickupMutation.isPending}
          onClick={() => pickupMutation.mutate(row.id)}
        >
          <UserCheck className="mr-1 h-3.5 w-3.5" />
          Customer Collected
        </Button>
      ),
    },
  ];

  const handleClaimAndPack = async (orderId: string): Promise<void> => {
    if (!user?.id) {
      toast.error('User not loaded');
      return;
    }
    try {
      await claimMutation.mutateAsync({ orderId, pickerUserId: user.id });
      setPackOrderId(orderId);
    } catch {
      // toast from mutation
    }
  };

  const handleConfirmPack = async (): Promise<void> => {
    if (!packOrderId || !user?.id || !packOrder?.items?.length) return;
    setPacking(true);
    try {
      await packMutation.mutateAsync({
        orderId: packOrderId,
        packerUserId: user.id,
        items: packOrder.items
          .filter((item) => item.id)
          .map((item) => ({
            orderItemId: item.id as string,
            packedQty: Number(item.quantity),
          })),
      });
      setPackOrderId(null);
    } finally {
      setPacking(false);
    }
  };

  const pickupRows = pickupData?.items ?? [];
  const pickupTotal = pickupData?.total ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Warehouse Packing</h2>
          <p className="text-sm text-muted-foreground">Claim orders, pack items, and release pickup orders to customers</p>
        </div>
        <div className="min-w-[220px]">
          <FormSelect
            value={locationId}
            onChange={setLocationId}
            options={locations.map((l) => ({
              value: l.id,
              label: `${l.name ?? l.id.slice(0, 8)} (${l.type ?? 'location'})`,
            }))}
            placeholder="Fulfillment location…"
          />
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('to-pack')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === 'to-pack' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          To Pack
          {queue.length > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">{queue.length}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('ready-for-pickup')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === 'ready-for-pickup' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PackageCheck className="h-4 w-4" />
          Ready for Pickup
        </button>
      </div>

      {tab === 'to-pack' ? (
        <DataTable
          title="Unclaimed Orders"
          description="Orders waiting to be claimed and packed at this location"
          columns={queueColumns}
          rows={queue}
          total={queue.length}
          page={1}
          loading={queueLoading}
          onPageChange={() => undefined}
          hideSearch
          onRefetch={() => void refetchQueue()}
          footerNote={!locationId ? 'Select a fulfillment location' : undefined}
        />
      ) : (
        <DataTable
          title="Ready for Pickup"
          description="Packed pickup orders — mark when customer collects"
          columns={pickupColumns}
          rows={pickupRows}
          total={pickupTotal}
          page={page}
          loading={pickupLoading}
          onPageChange={setPage}
          onSearchChange={setSearch}
          searchPlaceholder="Search order or customer…"
        />
      )}

      <FormDrawer
        open={!!packOrderId}
        onClose={() => setPackOrderId(null)}
        title={packOrder?.orderNumber ? `Pack ${packOrder.orderNumber}` : 'Pack Order'}
        subtitle={
          packOrder?.fulfillmentMode === 'pickup'
            ? 'Pickup order — customer will collect after packing'
            : 'Delivery order — will appear in Dispatch Center after packing'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPackOrderId(null)}>Cancel</Button>
            <Button disabled={packing || !packOrder?.items?.length} onClick={() => void handleConfirmPack()}>
              {packing ? 'Packing…' : 'Confirm Pack'}
            </Button>
          </>
        }
      >
        {!packOrder ? (
          <p className="text-sm text-muted-foreground">Loading order…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {packOrder.items?.length ?? 0} line(s) — confirm quantities packed
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {(packOrder.items ?? []).map((item) => (
                <li key={item.id ?? item.productId} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{productName.get(item.productId) ?? item.productId.slice(0, 8)}</span>
                  <span className="font-mono font-medium">× {Number(item.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
