import type { FleetDriver, Location, PaymentTiming, SaleType } from "../../../../types";
import type { DeliveryInfo, PosPayMethod } from "../../checkout";
import { fmt } from "../../posHelpers";

const PAY_METHODS: Array<{ value: PosPayMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

const PAYMENT_TIMING: Array<{ value: PaymentTiming; label: string }> = [
  { value: "cod", label: "COD" },
  { value: "before_delivery", label: "Before Delivery" },
  { value: "after_delivery", label: "After Delivery" },
  { value: "half", label: "Half" },
];

export interface PaymentLogisticsSectionProps {
  payMethod: PosPayMethod;
  onPayMethodChange: (m: PosPayMethod) => void;
  paymentReference: string;
  onPaymentReferenceChange: (v: string) => void;
  paymentTiming: PaymentTiming;
  onPaymentTimingChange: (t: PaymentTiming) => void;
  partialAmount: string;
  onPartialAmountChange: (v: string) => void;
  partialAmountMissing: boolean;
  notes: string;
  onNotesChange: (v: string) => void;
  locations: Location[];
  fulfillmentStoreIds: string[];
  onToggleFulfillmentStore: (id: string) => void;
  drivers: FleetDriver[];
  selectedDriverId: string;
  onDriverSelect: (driverId: string) => void;
  delivery: DeliveryInfo;
  onDeliveryChange: (d: DeliveryInfo) => void;
  saleType?: SaleType;
  blackMarkup?: number;
  facilitatorMode?: "none" | "user" | "name";
  onFacilitatorModeChange?: (m: "none" | "user" | "name") => void;
  facilitatorName?: string;
  onFacilitatorNameChange?: (v: string) => void;
  commissionPct?: string;
  onCommissionPctChange?: (v: string) => void;
}

export function PaymentLogisticsSection({
  payMethod,
  onPayMethodChange,
  paymentReference,
  onPaymentReferenceChange,
  paymentTiming,
  onPaymentTimingChange,
  partialAmount,
  onPartialAmountChange,
  partialAmountMissing,
  notes,
  onNotesChange,
  locations,
  fulfillmentStoreIds,
  onToggleFulfillmentStore,
  drivers,
  selectedDriverId,
  onDriverSelect,
  delivery,
  onDeliveryChange,
  saleType,
  blackMarkup = 0,
  facilitatorMode = "none",
  onFacilitatorModeChange,
  facilitatorName = "",
  onFacilitatorNameChange,
  commissionPct = "",
  onCommissionPctChange,
}: PaymentLogisticsSectionProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Payment &amp; Logistics</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Payment Method
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => onPayMethodChange(m.value)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    payMethod === m.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Payment Timing
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_TIMING.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onPaymentTimingChange(t.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    paymentTiming === t.value
                      ? "border border-primary bg-primary/10 text-primary"
                      : "border border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {payMethod !== "cash" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Reference
              </label>
              <input
                value={paymentReference}
                onChange={(e) => onPaymentReferenceChange(e.target.value)}
                placeholder="Transaction ID (optional)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          {paymentTiming === "half" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Partial Amount
              </label>
              <input
                type="number"
                value={partialAmount}
                onChange={(e) => onPartialAmountChange(e.target.value)}
                placeholder="Amount received now"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary ${
                  partialAmountMissing ? "border-destructive" : "border-border"
                }`}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Internal notes…"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fulfillment Routing
            </p>
            <div className="flex flex-wrap gap-3">
              {locations.map((loc) => (
                <label key={loc.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fulfillmentStoreIds.includes(loc.id)}
                    onChange={() => onToggleFulfillmentStore(loc.id)}
                    className="rounded border-border"
                  />
                  {loc.name ?? loc.code ?? "Store"}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Driver Assignment
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => onDriverSelect(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">— Select Driver —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName} · {d.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={delivery.vehicleNumber ?? ""}
              onChange={(e) => onDeliveryChange({ ...delivery, vehicleNumber: e.target.value })}
              placeholder="Vehicle no."
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
            />
            <input
              type="text"
              value={delivery.location ?? ""}
              onChange={(e) => onDeliveryChange({ ...delivery, location: e.target.value })}
              placeholder="Delivery location"
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {saleType === "black" && onFacilitatorModeChange && (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Black Sale · Markup {fmt(blackMarkup)}
          </p>
          <select
            value={facilitatorMode}
            onChange={(e) => onFacilitatorModeChange(e.target.value as "none" | "user" | "name")}
            className="mb-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="none">No facilitator</option>
            <option value="name">Facilitator name</option>
          </select>
          {facilitatorMode === "name" && onFacilitatorNameChange && (
            <input
              value={facilitatorName}
              onChange={(e) => onFacilitatorNameChange(e.target.value)}
              placeholder="Facilitator name"
              className="mb-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
            />
          )}
          {facilitatorMode !== "none" && onCommissionPctChange && (
            <input
              type="number"
              value={commissionPct}
              onChange={(e) => onCommissionPctChange(e.target.value)}
              placeholder="Commission %"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
            />
          )}
        </div>
      )}
    </section>
  );
}
