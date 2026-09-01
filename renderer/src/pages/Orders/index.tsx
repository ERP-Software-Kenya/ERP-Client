import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, Info, ShoppingBag, Store, Truck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BillingSettings, Customers, FleetDrivers, Inventory, Locations, Orders, Products } from '../../api';
import { patch } from '../../lib/http';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { Customer, CustomerType, Order, Product, SaleType } from '../../types';
import type { DeliveryInfo, PosPayMethod } from '../pos/checkout';
import {
  customerTypeToTier,
  productTierPrices,
  type BillLine,
  type ExtraCharge,
} from '../pos/posHelpers';
import { discountedRate, effectiveDiscountPercent } from '../pos/effectiveBilling';
import {
  buildLocationStockMap,
  cartQtyForProduct,
  getStockInfo,
  lineExceedsStock,
  saleHasStockIssues,
} from '../pos/posStock';
import { CustomerInfoSection } from '../pos/components/sales-order/CustomerInfoSection';
import { ProductDetailsSection } from '../pos/components/sales-order/ProductDetailsSection';
import { PaymentLogisticsSection } from '../pos/components/sales-order/PaymentLogisticsSection';
import { OrderSummarySidebar } from '../pos/components/sales-order/OrderSummarySidebar';
import { Button } from '../../components/ui/button';

let lineIdSeq = 500;

// ── Success banner shown after order creation ──────────────────────────────────

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
            <Button variant="outline" onClick={handleFulfillFromStore} disabled={fulfilling} className="flex items-center gap-2">
              <Store size={15} />
              {fulfilling ? 'Marking…' : 'Fulfill from Store'}
            </Button>
            <Button onClick={onNewOrder} variant="outline" className="flex items-center gap-2">
              <Truck size={15} />
              Send to Warehouse
            </Button>
          </div>
          <button type="button" onClick={onNewOrder} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
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

// ── Guidance banner ────────────────────────────────────────────────────────────

function GuidanceBanner({ onDismiss }: { onDismiss: () => void }): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-blue-200 bg-blue-50 px-6 py-3 dark:border-blue-900/40 dark:bg-blue-950/30">
      <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
      <div className="flex-1 text-sm text-blue-800 dark:text-blue-300">
        <span className="font-semibold">Delivery orders only.</span>{' '}
        Orders here go through warehouse packing and driver dispatch.{' '}
        For walk-in or counter sales,{' '}
        <button type="button" onClick={() => navigate('/pos/sales')} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-blue-600">
          <ShoppingBag size={13} />
          use New Sale instead
        </button>.
      </div>
      <button type="button" onClick={onDismiss} className="shrink-0 rounded p-0.5 text-blue-400 transition hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Page header ────────────────────────────────────────────────────────────────

function OrdersHeader({
  onSubmit,
  submitDisabled,
  submitting,
  createdOrder,
  onNewOrder,
}: {
  onSubmit: () => void;
  submitDisabled: boolean;
  submitting: boolean;
  createdOrder: Order | null;
  onNewOrder: () => void;
}): React.JSX.Element {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="text-xl font-bold leading-tight text-foreground">Sales Order</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Create a delivery order for warehouse dispatch.</p>
      </div>
      <div className="flex items-center gap-2">
        {createdOrder ? (
          <Button variant="outline" size="sm" onClick={onNewOrder}>New Order</Button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={13} />
            {submitting ? 'Creating…' : 'Create Order'}
          </button>
        )}
      </div>
    </header>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OrdersPage(): React.JSX.Element {
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const canCreateBlackSale = userRoles.some((r) => ['super_admin', 'org_admin', 'org_manager'].includes(r));

  const [lines, setLines] = useState<BillLine[]>([]);
  const [locationId, setLocationId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerInfo, setCustomerInfo] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('regular');
  const [saleType, setSaleType] = useState<SaleType>('normal');
  const [orderReference, setOrderReference] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<PosPayMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [paymentTiming, setPaymentTiming] = useState<'cod' | 'before_delivery' | 'after_delivery' | 'half'>('cod');
  const [partialAmount, setPartialAmount] = useState('');
  const [delivery, setDelivery] = useState<DeliveryInfo>({});
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [extraCharges] = useState<ExtraCharge[]>([]);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearch = useDebounce(searchVal, 250);

  const { data: locations = [] } = Locations.useList();
  const { data: inventory = [] } = Inventory.useList();
  const { data: typeRules = [] } = BillingSettings.useCustomerTypeRules();
  const { data: fleetDrivers = [] } = FleetDrivers.useList(true);
  const { data: productSearch } = Products.useSearch({ page: 1, limit: 20, search: debouncedSearch.trim() || undefined });
  const { data: selectedCustomer } = Customers.useGet(customerId || undefined);
  const createMutation = Orders.useCreate();

  const stockMap = useMemo(() => buildLocationStockMap(inventory, locationId), [inventory, locationId]);
  const stockLocation = useMemo(() => locations.find((l) => l.id === locationId), [locations, locationId]);

  const suggestions = useMemo(() => {
    if (!searchVal.trim()) return [];
    const items = productSearch?.items ?? [];
    const q = searchVal.toLowerCase();
    return items.filter((p) =>
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.barcode ?? '').toLowerCase().includes(q),
    ).slice(0, 6);
  }, [productSearch, searchVal]);

  const getStockInfoCb = useCallback(
    (productId: string) => getStockInfo(stockMap, productId, saleType),
    [stockMap, saleType],
  );
  const lineOverStock = useCallback(
    (line: BillLine) => lineExceedsStock(lines, line, stockMap, saleType),
    [lines, stockMap, saleType],
  );
  const hasStockIssues = saleHasStockIssues(lines, stockMap, saleType);

  const addProduct = (p: Product): void => {
    const stock = getStockInfoCb(p.id);
    const inCart = cartQtyForProduct(lines, p.id);
    if (!stock.found) { toast.error('No stock record at this location'); return; }
    if (stock.available <= 0) { toast.error('Out of stock at this location'); return; }
    const room = stock.available - inCart;
    if (room <= 0) { toast.error(`Already at max stock (${stock.available} available)`); return; }
    const tiers = productTierPrices(p);
    const tier = customerTypeToTier(customerType);
    const rate = discountedRate(tiers[tier], effectiveDiscountPercent(selectedCustomer, customerType, typeRules));
    const existing = lines.find((l) => l.productId === p.id);
    if (existing) {
      setLines((ls) => ls.map((l) => l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
    } else {
      setLines((ls) => [...ls, {
        id: ++lineIdSeq, productId: p.id,
        sku: formatEntityLabel({ sku: p.sku, id: p.id }),
        name: p.name || 'Unnamed product',
        qty: 1, rate, taxPct: 0,
        unitLabel: p.unit || 'pcs',
        officialRate: tiers[tier],
        p1: tiers.p1, p2: tiers.p2, p3: tiers.p3, p4: tiers.p4,
        activeTier: tier,
        storeCode: stockLocation?.name?.slice(0, 1).toUpperCase(),
        manufacturer: p.manufacturer,
        packSize: p.packSize,
      }]);
    }
    setSearchVal('');
  };

  const handleLineQtyChange = (lineId: number, newQty: number): void => {
    setLines((ls) => ls.map((l) => {
      if (l.id !== lineId) return l;
      const stock = getStockInfo(stockMap, l.productId, saleType);
      const others = cartQtyForProduct(ls, l.productId, lineId);
      const maxForLine = Math.max(0.001, stock.available - others);
      const qty = Math.min(Math.max(0.001, newQty), maxForLine);
      return { ...l, qty };
    }));
  };

  const handleRateChange = (lineId: number, rate: number): void => {
    setLines((ls) => ls.map((l) => l.id === lineId ? { ...l, rate } : l));
  };

  const handleDriverSelect = (driverId: string): void => {
    setSelectedDriverId(driverId);
    const driver = fleetDrivers.find((d) => d.id === driverId);
    if (driver) {
      setDelivery((prev) => ({ ...prev, driverName: `${driver.firstName} ${driver.lastName}`.trim(), license: driver.licenseNumber }));
    } else {
      setDelivery((prev) => ({ ...prev, driverName: undefined, license: undefined }));
    }
  };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const totalTax = 0;
  const extraTotal = extraCharges.reduce((s, c) => s + c.amount, 0);
  const grandTotal = subtotal + totalTax + extraTotal;
  const listSubtotal = lines.reduce((s, l) => s + l.qty * (l.officialRate ?? l.rate), 0);
  const discountAmount = Math.max(0, listSubtotal - subtotal);
  const partialAmountMissing = paymentTiming === 'half' && (!partialAmount || isNaN(Number(partialAmount)) || Number(partialAmount) <= 0);
  const submitDisabled = !locationId || !customerId || lines.length === 0 || createMutation.isPending || hasStockIssues || partialAmountMissing;

  const handleSubmit = (): void => {
    if (!locationId) { toast.error('Select a location'); return; }
    if (!customerId) { toast.error('Select a customer'); return; }
    if (lines.length === 0) { toast.error('Add at least one product'); return; }

    createMutation.mutate(
      { locationId, customerId, status: 'confirmed', subtotal, taxAmount: totalTax, totalAmount: grandTotal, paymentStatus: 'UNPAID' } as Partial<Order>,
      { onSuccess: (created) => setCreatedOrder(created) },
    );
  };

  const handleNewOrder = (): void => {
    setLines([]);
    setLocationId('');
    setCustomerId('');
    setCustomerInfo('');
    setCustomerType('regular');
    setSaleType('normal');
    setOrderReference('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setCashTendered('');
    setPaymentTiming('cod');
    setPartialAmount('');
    setDelivery({});
    setSelectedDriverId('');
    setSearchVal('');
    setCreatedOrder(null);
    setBannerDismissed(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted">
      <OrdersHeader
        onSubmit={handleSubmit}
        submitDisabled={submitDisabled}
        submitting={createMutation.isPending}
        createdOrder={createdOrder}
        onNewOrder={handleNewOrder}
      />

      {!bannerDismissed && !createdOrder && (
        <GuidanceBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {createdOrder ? (
          <SuccessBanner order={createdOrder} onNewOrder={handleNewOrder} />
        ) : (
          <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
              <CustomerInfoSection
                saleRef="SO-NEW"
                orderReference={orderReference}
                onOrderReferenceChange={setOrderReference}
                customerInfo={customerInfo}
                onCustomerInfoChange={(v) => { setCustomerInfo(v); setCustomerId(''); }}
                customerId={customerId}
                onCustomerSelect={(c: Customer) => {
                  setCustomerId(c.id);
                  setCustomerInfo(formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }));
                  setCustomerType((c.customerType as CustomerType) || 'regular');
                }}
                onClearCustomer={() => { setCustomerId(''); setCustomerInfo(''); }}
                selectedCustomer={selectedCustomer}
                customerType={customerType}
                onCustomerTypeChange={setCustomerType}
                saleType={saleType}
                onSaleTypeChange={setSaleType}
                canCreateBlackSale={canCreateBlackSale}
                creditBalance={Number(selectedCustomer?.creditBalance ?? 0)}
                billedBy={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.email || 'Admin'}
                transactionDate={transactionDate}
                onTransactionDateChange={setTransactionDate}
                locations={locations}
                locationId={locationId}
                onLocationChange={setLocationId}
              />

              <ProductDetailsSection
                saleType={saleType}
                searchRef={searchRef}
                searchVal={searchVal}
                onSearchChange={setSearchVal}
                onEnter={() => { if (suggestions.length > 0) addProduct(suggestions[0]); }}
                suggestions={suggestions}
                onAddProduct={addProduct}
                getStockInfo={getStockInfoCb}
                lineOverStock={lineOverStock}
                hasStockIssues={hasStockIssues}
                lines={lines}
                extraCharges={extraCharges}
                onQtyChange={handleLineQtyChange}
                onRateChange={handleRateChange}
                onRemoveLine={(id) => setLines((ls) => ls.filter((l) => l.id !== id))}
                onRemoveCharge={() => undefined}
                storeCode={stockLocation?.name?.slice(0, 1).toUpperCase()}
                checkoutResult={null}
                showCheckoutFailureBanner={false}
              />

              <PaymentLogisticsSection
                paymentReference=""
                onPaymentReferenceChange={() => undefined}
                paymentTiming={paymentTiming}
                onPaymentTimingChange={setPaymentTiming}
                partialAmount={partialAmount}
                onPartialAmountChange={setPartialAmount}
                partialAmountMissing={partialAmountMissing}
                notes={delivery.note ?? ''}
                onNotesChange={(note) => setDelivery((d) => ({ ...d, note }))}
                drivers={fleetDrivers}
                selectedDriverId={selectedDriverId}
                onDriverSelect={handleDriverSelect}
                delivery={delivery}
                onDeliveryChange={setDelivery}
                saleType={saleType}
              />
            </div>

            <OrderSummarySidebar
              subtotal={subtotal}
              totalTax={totalTax}
              extraTotal={extraTotal}
              discountAmount={discountAmount}
              previousBalance={0}
              grandTotal={grandTotal}
              payMethod={payMethod}
              onPayMethodChange={setPayMethod}
              cashTendered={cashTendered}
              onCashTenderedChange={setCashTendered}
              grandTotalWithBalance={grandTotal}
              saleType={saleType}
              creditNeedsApproval={false}
              creditMissingCustomer={false}
              creditMissingLimit={false}
              hasStockIssues={hasStockIssues}
              generateDisabled={submitDisabled}
              checkingOut={createMutation.isPending}
              onCompleteSale={handleSubmit}
              onPrintBill={() => undefined}
              onDeliveryNote={() => undefined}
              onShareToDriver={() => undefined}
              hasReceipt={false}
              hasDriver={!!selectedDriverId}
            />
          </>
        )}
      </div>
    </div>
  );
}
