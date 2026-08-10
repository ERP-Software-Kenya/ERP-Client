import { ChevronDown, Package, ShoppingCart } from "lucide-react";
import type { CustomerType, Location, PaymentTiming, SaleType } from "../../../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import type { PosPayMethod } from "../checkout";
import type { Mode } from "../posHelpers";

const PAY_METHODS: Array<{ value: PosPayMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "till", label: "Till" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

const SALE_TYPE_OPTIONS: Array<{ value: SaleType; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "credit", label: "Credit" },
  { value: "black", label: "Black" },
];

const CUSTOMER_TYPE_OPTIONS: Array<{ value: CustomerType; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "new", label: "New" },
  { value: "shop", label: "Shop" },
  { value: "big_customer", label: "Big Customer" },
];

const PAYMENT_TIMING_OPTIONS: Array<{ value: PaymentTiming; label: string }> = [
  { value: "cod", label: "COD" },
  { value: "before_delivery", label: "Before Delivery" },
  { value: "after_delivery", label: "After Delivery" },
  { value: "half", label: "Half" },
];

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange("sales")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          mode === "sales"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <ShoppingCart size={14} />
        Sales
      </button>
      {/* <button
        type="button"
        onClick={() => onChange("purchase")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          mode === "purchase"
            ? "bg-orange-500 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <PackagePlus size={14} />
        Purchase Receiving
      </button> */}
    </div>
  );
}

function SaleTypeToggle({
  saleType,
  onChange,
  canCreateBlackSale,
}: {
  saleType: SaleType;
  onChange: (t: SaleType) => void;
  canCreateBlackSale: boolean;
}) {
  const options = SALE_TYPE_OPTIONS.filter(
    (o) => o.value !== "black" || canCreateBlackSale,
  );
  return (
    <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            saleType === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomerTypeRow({
  customerType,
  onChange,
}: {
  customerType: CustomerType;
  onChange: (t: CustomerType) => void;
}) {
  return (
    <select
      value={customerType}
      onChange={(e) => onChange(e.target.value as CustomerType)}
      title="Customer type"
      className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-card outline-none focus:border-primary max-w-[140px]"
    >
      {CUSTOMER_TYPE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PaymentTimingRow({
  paymentTiming,
  onChange,
}: {
  paymentTiming: PaymentTiming;
  onChange: (t: PaymentTiming) => void;
}) {
  return (
    <select
      value={paymentTiming}
      onChange={(e) => onChange(e.target.value as PaymentTiming)}
      title="Payment timing"
      className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-card outline-none focus:border-primary max-w-[150px]"
    >
      {PAYMENT_TIMING_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export interface PosToolbarProps {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  saleType: SaleType;
  onSaleTypeChange: (t: SaleType) => void;
  canCreateBlackSale: boolean;
  locations: Location[];
  locationsLoading: boolean;
  locationId: string;
  onLocationChange: (id: string) => void;
  stockLocation: Location | undefined;
  payMethod: PosPayMethod;
  onPayMethodChange: (m: PosPayMethod) => void;
  paymentTiming: PaymentTiming;
  onPaymentTimingChange: (t: PaymentTiming) => void;
  customerType: CustomerType;
  onCustomerTypeChange: (t: CustomerType) => void;
  badgeCls: string;
}

export function PosToolbar({
  mode,
  onModeChange,
  saleType,
  onSaleTypeChange,
  canCreateBlackSale,
  locations,
  locationsLoading,
  locationId,
  onLocationChange,
  stockLocation,
  payMethod,
  onPayMethodChange,
  paymentTiming,
  onPaymentTimingChange,
  customerType,
  onCustomerTypeChange,
  badgeCls,
}: PosToolbarProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 bg-card border-b border-border flex-shrink-0 flex-wrap">
      {/* Transaction context cluster */}
      <div className="flex items-center gap-3 flex-wrap">
        <ModeToggle
          mode={mode}
          onChange={onModeChange}
        />

        {mode === "sales" && (
          <SaleTypeToggle
            saleType={saleType}
            onChange={onSaleTypeChange}
            canCreateBlackSale={canCreateBlackSale}
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={locationsLoading}
              className="flex items-center gap-2 text-sm border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground font-medium focus:outline-none focus:border-primary max-w-[220px] disabled:opacity-50"
            >
              <Package size={15} className="text-muted-foreground flex-shrink-0" />
              <span className="truncate">
                {locationsLoading
                  ? "Loading…"
                  : stockLocation
                    ? `${stockLocation.name} (${stockLocation.type.charAt(0).toUpperCase() + stockLocation.type.slice(1)})`
                    : locations.length === 0
                      ? "No locations"
                      : "Select location"}
              </span>
              <ChevronDown size={13} className="text-muted-foreground flex-shrink-0 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            <DropdownMenuRadioGroup value={locationId} onValueChange={onLocationChange}>
              {locations.map((l) => (
                <DropdownMenuRadioItem key={l.id} value={l.id}>
                  {l.name} ({l.type.charAt(0).toUpperCase() + l.type.slice(1)})
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {mode === "sales" && (
        <>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

          {/* Payment context cluster */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={payMethod}
              onChange={(e) => onPayMethodChange(e.target.value as PosPayMethod)}
              className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-card outline-none focus:border-primary max-w-[120px]"
              title="Payment method"
            >
              {PAY_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <PaymentTimingRow
              paymentTiming={paymentTiming}
              onChange={onPaymentTimingChange}
            />
            <CustomerTypeRow
              customerType={customerType}
              onChange={onCustomerTypeChange}
            />
          </div>
        </>
      )}

      <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
        <span className={`px-2 py-1 rounded-md font-medium ${badgeCls}`}>
          {mode === "sales" ? "SALES MODE" : "PURCHASE MODE"}
        </span>
      </div>
    </div>
  );
}
