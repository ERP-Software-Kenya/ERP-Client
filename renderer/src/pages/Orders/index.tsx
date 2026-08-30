import { useState } from 'react';
import { Check, Info, ShoppingBag, Store, Truck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Locations, Orders } from '../../api';
import { patch } from '../../lib/http';
import { useAuth } from '../../context/AuthContext';
import type { Customer, Order, Product } from '../../types';
import { Button } from '../../components/ui/button';
import { OrderProductSearch } from './OrderProductSearch';
import { OrderItemsTable, type OrderLineItem } from './OrderItemsTable';
import { OrderSidePanel } from './OrderSidePanel';

let lineSeq = 0;

function nextId(): number {
  lineSeq += 1;
  return lineSeq;
}

interface SuccessBannerProps {
  order: Order;
  onNewOrder: () => void;
}

function SuccessBanner({ order, onNewOrder }: SuccessBannerProps): React.JSX.Element {
  const [fulfilling, setFulfilling] = useState(false);
  const [fulfilled, setFulfilled] = useState(false);
  const { user } = useAuth();

  const handleFulfillFromStore = async (): Promise<void> => {
    setFulfilling(true);
    try {
      await patch(`/api/v1/warehouse/orders/${order.id}/fulfill-from-store`, { userId: user?.id ?? '' });
      setFulfilled(true);
      toast.success('Order marked as packed — ready for dispatch');
    } catch {
      toast.error('Failed to fulfill from store');
    } finally {
      setFulfilling(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <Check size={32} strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Order Created</h2>
        <p className="font-mono text-sm text-muted-foreground">
          {order.orderNumber ?? order.id.slice(0, 12).toUpperCase()}
        </p>
        {order.totalAmount != null && (
          <p className="text-lg font-bold text-primary">
            ${Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {!fulfilled ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">How should this order be fulfilled?</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleFulfillFromStore}
              disabled={fulfilling}
              className="flex items-center gap-2"
            >
              <Store size={15} />
              {fulfilling ? 'Marking…' : 'Fulfill from Store'}
            </Button>
            <Button onClick={onNewOrder} variant="outline" className="flex items-center gap-2">
              <Truck size={15} />
              Send to Warehouse
            </Button>
          </div>
          <button
            type="button"
            onClick={onNewOrder}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            New Order
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-emerald-600">Packed — ready for dispatch</p>
          <Button onClick={onNewOrder} className="px-8">New Order</Button>
        </div>
      )}
    </div>
  );
}

function GuidanceBanner({ onDismiss }: { onDismiss: () => void }): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-blue-200 bg-blue-50 px-6 py-3 dark:border-blue-900/40 dark:bg-blue-950/30">
      <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
      <div className="flex-1 text-sm text-blue-800 dark:text-blue-300">
        <span className="font-semibold">This screen is for delivery orders only.</span>{' '}
        Orders created here go through warehouse packing and driver dispatch before reaching the customer.{' '}
        For an immediate walk-in or counter sale,{' '}
        <button
          type="button"
          onClick={() => navigate('/pos/sales')}
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-blue-600"
        >
          <ShoppingBag size={13} />
          use New Sale instead
        </button>
        .
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 text-blue-400 transition hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function OrdersPage(): React.JSX.Element {
  const [items, setItems] = useState<OrderLineItem[]>([]);
  const [locationId, setLocationId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerInfo, setCustomerInfo] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data: locations = [] } = Locations.useList();
  const createMutation = Orders.useCreate();

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const taxAmount = 0;
  const totalAmount = subtotal + taxAmount;

  const handleAddProduct = (p: Product) => {
    const price = Number(p.retailPrice ?? 0);
    const existing = items.find((it) => it.productId === p.id);
    if (existing) {
      setItems((prev) => prev.map((it) => it.productId === p.id ? { ...it, qty: it.qty + 1 } : it));
    } else {
      setItems((prev) => [
        ...prev,
        { id: nextId(), productId: p.id, name: p.name ?? 'Unnamed product', unitPrice: price, qty: 1 },
      ]);
    }
  };

  const handleQtyChange = (id: number, qty: number) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, qty } : it));
  };

  const handleRemove = (id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleCustomerSelect = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerInfo([c.name, c.phone].filter(Boolean).join(' · '));
  };

  const handleClearCustomer = () => {
    setCustomerId('');
    setCustomerInfo('');
  };

  const handleSubmit = () => {
    if (!locationId) { toast.error('Select a location'); return; }
    if (!customerId) { toast.error('Select a customer'); return; }
    if (items.length === 0) { toast.error('Add at least one product'); return; }

    createMutation.mutate(
      {
        locationId,
        customerId,
        status: 'confirmed',
        subtotal,
        taxAmount,
        totalAmount,
        paymentStatus: 'UNPAID',
      } as Partial<Order>,
      {
        onSuccess: (created) => {
          setCreatedOrder(created);
        },
      },
    );
  };

  const handleNewOrder = () => {
    setItems([]);
    setLocationId('');
    setCustomerId('');
    setCustomerInfo('');
    setDeliveryAddress('');
    setCreatedOrder(null);
    setBannerDismissed(false);
  };

  const canSubmit = !!locationId && !!customerId && items.length > 0 && !createMutation.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
        <h1 className="text-base font-semibold text-foreground">Sales Orders</h1>
        {createdOrder && (
          <Button variant="outline" size="sm" onClick={handleNewOrder}>
            New Order
          </Button>
        )}
      </div>

      {/* Guidance banner */}
      {!bannerDismissed && !createdOrder && (
        <GuidanceBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {createdOrder ? (
          <SuccessBanner order={createdOrder} onNewOrder={handleNewOrder} />
        ) : (
          <>
            {/* Left: product search */}
            <OrderProductSearch onAddProduct={handleAddProduct} />

            {/* Center: order items */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center border-b border-border bg-card px-5 py-3">
                <span className="font-semibold text-foreground">Order Items</span>
                {items.length > 0 && (
                  <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="ml-auto rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Clear
                  </button>
                )}
              </div>
              <OrderItemsTable items={items} onQtyChange={handleQtyChange} onRemove={handleRemove} />
            </div>

            {/* Right: sidebar */}
            <OrderSidePanel
              locations={locations}
              locationId={locationId}
              onLocationChange={setLocationId}
              customerId={customerId}
              customerInfo={customerInfo}
              onCustomerInfoChange={(v) => { setCustomerInfo(v); setCustomerId(''); }}
              onCustomerSelect={handleCustomerSelect}
              onClearCustomer={handleClearCustomer}
              deliveryAddress={deliveryAddress}
              onDeliveryAddressChange={setDeliveryAddress}
              subtotal={subtotal}
              taxAmount={taxAmount}
              totalAmount={totalAmount}
              canSubmit={canSubmit}
              isSubmitting={createMutation.isPending}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </div>
    </div>
  );
}
