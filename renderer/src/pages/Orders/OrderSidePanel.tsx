import { LayoutDashboard, MapPin } from 'lucide-react';
import type { Customer, Location } from '../../types';
import { CustomerPicker } from '../../components/CustomerPicker';
import { FormSelect } from '../../components/FormSelect';
import { Button } from '../../components/ui/button';

interface OrderSidePanelProps {
  locations: Location[];
  locationId: string;
  onLocationChange: (id: string) => void;
  customerId: string;
  customerInfo: string;
  onCustomerInfoChange: (v: string) => void;
  onCustomerSelect: (c: Customer) => void;
  onClearCustomer: () => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (v: string) => void;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SideLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <label className="mb-1 block text-xs font-medium text-muted-foreground">{children}</label>;
}

export function OrderSidePanel({
  locations,
  locationId,
  onLocationChange,
  customerId,
  customerInfo,
  onCustomerInfoChange,
  onCustomerSelect,
  onClearCustomer,
  deliveryAddress,
  onDeliveryAddressChange,
  subtotal,
  taxAmount,
  totalAmount,
  canSubmit,
  isSubmitting,
  onSubmit,
}: OrderSidePanelProps): React.JSX.Element {
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }));

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-muted/40 p-4">
      {/* Customer */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <MapPin size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Order Details</h2>
        </div>
        <div className="space-y-3 px-4 py-3">
          <div>
            <SideLabel>Customer</SideLabel>
            <CustomerPicker
              customerId={customerId}
              onSelect={onCustomerSelect}
              onClear={onClearCustomer}
              value={customerInfo}
              onChange={onCustomerInfoChange}
              placeholder="Search customer…"
            />
          </div>

          <div>
            <SideLabel>Location / Store</SideLabel>
            <FormSelect
              value={locationId}
              onChange={onLocationChange}
              options={locationOptions}
              placeholder="Select location…"
              className="h-9 py-1.5"
            />
          </div>

          <div>
            <SideLabel>Delivery Address</SideLabel>
            <textarea
              value={deliveryAddress}
              onChange={(e) => onDeliveryAddressChange(e.target.value)}
              placeholder="Street, city, postal code…"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <LayoutDashboard size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Order Summary</h2>
        </div>
        <div className="space-y-2.5 px-4 py-3">
          <SummaryRow label="Subtotal" value={fmt(subtotal)} />
          <SummaryRow label="Tax" value={fmt(taxAmount)} />
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums text-primary">{fmt(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Create button */}
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl py-3 text-sm font-bold"
      >
        {isSubmitting ? 'Creating…' : 'Create Order'}
      </Button>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
