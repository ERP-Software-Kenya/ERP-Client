import { Pencil } from "lucide-react";
import type { Customer, CustomerType, SaleType } from "../../../../types";
import { CustomerPicker } from "../../../../components/CustomerPicker";
import { fmt } from "../../posHelpers";

const CUSTOMER_TYPES: Array<{ value: CustomerType; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "new", label: "New" },
  { value: "shop", label: "Shop" },
  { value: "big_customer", label: "Company" },
];

export interface CustomerInfoSectionProps {
  saleRef: string;
  orderReference: string;
  onOrderReferenceChange: (v: string) => void;
  customerInfo: string;
  onCustomerInfoChange: (v: string) => void;
  customerId: string;
  onCustomerSelect: (c: Customer) => void;
  onClearCustomer: () => void;
  selectedCustomer: Customer | undefined;
  customerType: CustomerType;
  onCustomerTypeChange: (t: CustomerType) => void;
  saleType: SaleType;
  creditBalance: number;
}

export function CustomerInfoSection({
  saleRef,
  orderReference,
  onOrderReferenceChange,
  customerInfo,
  onCustomerInfoChange,
  customerId,
  onCustomerSelect,
  onClearCustomer,
  selectedCustomer,
  customerType,
  onCustomerTypeChange,
  saleType,
  creditBalance,
}: CustomerInfoSectionProps) {
  const balance = customerId ? creditBalance : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Customer Information</h2>
        {customerId && (
          <button
            type="button"
            onClick={onClearCustomer}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Pencil size={12} /> Edit Customer
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Field label="Sales #">
          <input
            readOnly
            value={saleRef}
            className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground"
          />
        </Field>
        <Field label="Reference #">
          <input
            value={orderReference}
            onChange={(e) => onOrderReferenceChange(e.target.value)}
            placeholder="PO / Ref Number"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Customer Name" className="col-span-2">
          <CustomerPicker
            customerId={customerId}
            onSelect={onCustomerSelect}
            onClear={onClearCustomer}
            value={customerInfo}
            onChange={onCustomerInfoChange}
            placeholder={saleType === "credit" ? "Search creditor…" : "Search customer or walk-in name…"}
            creditOnly={saleType === "credit"}
            customerType={customerType}
          />
        </Field>
        <Field label="Category">
          <select
            value={customerType}
            onChange={(e) => onCustomerTypeChange(e.target.value as CustomerType)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {CUSTOMER_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Balance">
          <div
            className={`rounded-lg border border-border px-3 py-2 text-sm font-semibold tabular-nums ${
              balance > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
            }`}
          >
            {fmt(balance)}
          </div>
        </Field>
        <Field label="Phone">
          <div className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            {selectedCustomer?.phone ?? "—"}
          </div>
        </Field>
        <Field label="Email">
          <div className="truncate rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            {selectedCustomer?.email ?? "—"}
          </div>
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
