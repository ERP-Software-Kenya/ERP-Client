import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  Check,
  ChevronDown,
  Mail,
  Minus,
  Package,
  PackagePlus,
  PauseCircle,
  Plus,
  Printer,
  Receipt,
  Scan,
  ShoppingCart,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import {
  Customers,
  Inventory,
  Locations,
  Products,
  Suppliers,
  ClerkUsers,
} from "../../api";
import { get } from "../../lib/http";
import { useAuth } from "../../context/AuthContext";
import type {
  Bill,
  Customer,
  CustomerType,
  Location,
  PaymentTiming,
  Product,
  SaleType,
  Supplier,
} from "../../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useDebounce } from "../../hooks/useDebounce";
import { formatEntityLabel } from "../../lib/entityLabel";
import { CustomerFormDrawer } from "../../components/CustomerFormDrawer";
import {
  createDraftSale,
  runPurchaseCheckout,
  runSalesCheckout,
  type CheckoutResult,
  type CheckoutStep,
  type DeliveryInfo,
  type PosPayMethod,
  type PosReceipt,
} from "./checkout";
import { ReceiptDocument } from "./ReceiptDocument";
import { DebtorNoteDocument } from "./DebtorNoteDocument";
import { StatementDocument } from "./StatementDocument";
import { DeliveryNoteDocument } from "./DeliveryNoteDocument";
import {
  buildSaleDocHtml,
  defaultPdfFileName,
  type SaleDocKind,
} from "./buildSaleDocHtml";
import HeldSalesPanel from "./HeldSalesPanel";

type Mode = "sales" | "purchase";
type PayMethod = PosPayMethod;
type PrintDoc = "receipt" | "debtor" | "statement" | "delivery";

const PAY_METHODS: Array<{ value: PosPayMethod; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "till", label: "Till" },
  { value: "bank", label: "Bank" },
  { value: "other", label: "Other" },
];

interface BillLine {
  id: number;
  productId: string;
  sku: string;
  name: string;
  qty: number;
  rate: number;
  taxPct: number;
  unitLabel: string;
  officialRate: number;
}

interface ExtraCharge {
  id: number;
  label: string;
  amount: number;
}

const QUICK_CHARGES = [
  { label: "Delivery Fee", amount: 200 },
  { label: "Packaging", amount: 50 },
  { label: "Store Credit", amount: -100 },
  { label: "Discount", amount: -50 },
];

const TAXES_LIST = [
  { name: "VAT 16%", pct: 16 },
  { name: "VAT 8%", pct: 8 },
  { name: "None", pct: 0 },
];

let lineIdSeq = 100;

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lineTax(l: BillLine) {
  return (l.qty * l.rate * l.taxPct) / 100;
}
function lineTotal(l: BillLine) {
  return l.qty * l.rate + lineTax(l);
}

function productRate(p: Product, mode: Mode): number {
  if (mode === "purchase")
    return Number(p.costPrice ?? p.wholesalePrice ?? p.retailPrice ?? 0);
  return Number(p.retailPrice ?? p.wholesalePrice ?? p.costPrice ?? 0);
}

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

const SALE_TYPE_OPTIONS: Array<{ value: SaleType; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "credit", label: "Credit" },
  { value: "black", label: "Black" },
];

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

const CUSTOMER_TYPE_OPTIONS: Array<{ value: CustomerType; label: string }> = [
  { value: "regular", label: "Regular" },
  { value: "new", label: "New" },
  { value: "shop", label: "Shop" },
  { value: "big_customer", label: "Big Customer" },
];

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

const PAYMENT_TIMING_OPTIONS: Array<{ value: PaymentTiming; label: string }> = [
  { value: "cod", label: "COD" },
  { value: "before_delivery", label: "Before Delivery" },
  { value: "after_delivery", label: "After Delivery" },
  { value: "half", label: "Half" },
];

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

function StepList({ steps }: { steps: CheckoutStep[] }) {
  return (
    <ul className="max-h-36 space-y-1.5 overflow-y-auto text-left">
      {steps.map((s) => (
        <li
          key={s.name}
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs"
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                s.status === "ok"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : s.status === "failed"
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {s.status}
            </span>
            <span className="font-medium text-foreground">{s.name}</span>
          </div>
          {s.message && (
            <p className="mt-1 break-words text-muted-foreground leading-relaxed">
              {s.message}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function printReceipt() {
  window.print();
}

async function downloadSalePdf(receipt: PosReceipt, kind: SaleDocKind) {
  const api = window.electronAPI;
  if (!api?.savePdf) {
    toast.error("PDF download needs the desktop app");
    return;
  }
  const res = await api.savePdf({
    html: buildSaleDocHtml(receipt, kind),
    defaultFileName: defaultPdfFileName(receipt, kind),
  });
  if (res.canceled) return;
  if (!res.success) {
    toast.error(res.error || "Could not save PDF");
    return;
  }
  toast.success("PDF saved");
}

function BillSuccessModal({
  receipt,
  steps,
  printDoc,
  onPrintDoc,
  onClose,
}: {
  receipt: PosReceipt;
  steps: CheckoutStep[];
  printDoc: PrintDoc;
  onPrintDoc: (doc: PrintDoc) => void;
  onClose: () => void;
}) {
  const hasGaps = steps.some(
    (s) => s.status === "failed" || s.status === "skipped",
  );
  const failed = steps.some((s) => s.status === "failed");
  const preview =
    printDoc === "debtor" ? (
      <DebtorNoteDocument receipt={receipt} />
    ) : printDoc === "statement" ? (
      <StatementDocument receipt={receipt} />
    ) : printDoc === "delivery" ? (
      <DeliveryNoteDocument receipt={receipt} />
    ) : (
      <ReceiptDocument receipt={receipt} />
    );

  const docButtons: Array<{ id: PrintDoc; label: string }> = [
    { id: "receipt", label: "Receipt" },
    { id: "debtor", label: "Debtor Note" },
    { id: "statement", label: "Statement" },
    { id: "delivery", label: "Delivery Note" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pos-no-print">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="pos-success-title"
        className="relative flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex-shrink-0 border-b border-border px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
                receipt.synced && !failed
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-amber-500/15 text-amber-500"
              }`}
            >
              <Check size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="pos-success-title"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {receipt.mode === "sales"
                  ? "Sale complete"
                  : "Purchase order created"}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                {receipt.ref}
              </p>
              <div className="mt-2">
                {receipt.synced && !failed ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Synced to server
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Partial sync — review steps
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                $
                {receipt.totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {receipt.mode === "sales" && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {docButtons.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onPrintDoc(b.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    printDoc === b.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 sm:p-4">
            <div className="overflow-hidden rounded-lg ring-1 ring-black/5">
              {preview}
            </div>
          </div>

          {hasGaps && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Checkout steps
              </p>
              <StepList steps={steps} />
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 flex-col gap-2 border-t border-border bg-card/80 px-5 py-4 backdrop-blur">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={printReceipt}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Printer size={15} />
              Print
            </button>
            {receipt.mode === "sales" && (
              <button
                type="button"
                onClick={() => void downloadSalePdf(receipt, printDoc)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                PDF
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            {receipt.mode === "sales" ? "New sale" : "New purchase order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSTerminal() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "purchase" ? "purchase" : "sales",
  );
  const [locationId, setLocationId] = useState("");
  const [lines, setLines] = useState<BillLine[]>([]);
  const [searchVal, setSearchVal] = useState("");
  const [qty, setQty] = useState(1);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [cashTendered, setCashTendered] = useState("");
  const [customerInfo, setCustomerInfo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [overrideLine, setOverrideLine] = useState<number | null>(null);
  const [overridePrice, setOverridePrice] = useState("");
  const [overrideTax, setOverrideTax] = useState("");
  const [success, setSuccess] = useState<{
    receipt: PosReceipt;
    steps: CheckoutStep[];
  } | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);
  const [printDoc, setPrintDoc] = useState<PrintDoc>("receipt");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(
    null,
  );
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [saleType, setSaleType] = useState<SaleType>("normal");
  const [customerType, setCustomerType] = useState<CustomerType>("regular");
  const [paymentTiming, setPaymentTiming] = useState<PaymentTiming>("cod");
  const [partialAmount, setPartialAmount] = useState("");
  const [holding, setHolding] = useState(false);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryInfo>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const [facilitatorMode, setFacilitatorMode] = useState<'none' | 'user' | 'name'>('none');
  const [facilitatorUserId, setFacilitatorUserId] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [facilitatorSearchVal, setFacilitatorSearchVal] = useState("");
  const [showFacilitatorSuggestions, setShowFacilitatorSuggestions] = useState(false);

  const { user } = useAuth();
  const userRoles = user?.roles ?? [];
  const canCreateBlackSale = userRoles.some((r) =>
    ["super_admin", "org_admin", "org_manager"].includes(r),
  );

  const debouncedCustomerInfo = useDebounce(customerInfo, 300);

  const { data: locations = [], isLoading: locationsLoading } =
    Locations.useList();
  const { data: inventory = [] } = Inventory.useList();
  const { data: suppliers = [] } = Suppliers.useList(mode === "purchase");
  const { data: productSearch } = Products.useSearch({
    page: 1,
    limit: 20,
    search: searchVal.trim() || undefined,
  });
  const { data: customerSearch } = Customers.useSearch({
    page: 1,
    limit: 8,
    search:
      mode === "sales" &&
      debouncedCustomerInfo.trim().length >= 2 &&
      !customerId
        ? debouncedCustomerInfo.trim()
        : undefined,
    enabled:
      mode === "sales" &&
      debouncedCustomerInfo.trim().length >= 2 &&
      !customerId,
  });
  const { data: selectedCustomer } = Customers.useGet(
    mode === "sales" && (saleType === "credit" || saleType === "black") && customerId
      ? customerId
      : undefined,
  );

  const { data: facilitatorSearch } = ClerkUsers.useSearch({
    page: 1,
    limit: 8,
    query: facilitatorSearchVal.trim(),
    enabled: facilitatorMode === "user" && facilitatorSearchVal.trim().length >= 2 && !facilitatorUserId,
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (locations.length === 0 || locationId) return;
    setLocationId(locations[0].id);
  }, [locations, locationId]);

  const stockLocation = useMemo(
    () => locations.find((l: Location) => l.id === locationId),
    [locations, locationId],
  );
  const orgId = stockLocation?.organizationId;

  const suggestions: Product[] = useMemo(() => {
    if (!searchVal.trim()) return [];
    const items = productSearch?.items ?? [];
    const q = searchVal.toLowerCase();
    return items
      .filter(
        (p) =>
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [productSearch, searchVal]);

  const addProduct = (p: Product) => {
    const sku = formatEntityLabel({ sku: p.sku, id: p.id });
    const existing = lines.find((l) => l.productId === p.id);
    if (existing) {
      setLines((ls) =>
        ls.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + qty } : l)),
      );
    } else {
      setLines((ls) => [
        ...ls,
        {
          id: ++lineIdSeq,
          productId: p.id,
          sku,
          name: p.name || "Unnamed product",
          qty,
          rate: productRate(p, mode),
          taxPct: 0,
          unitLabel: p.unit || "pcs",
          officialRate: productRate(p, mode),
        },
      ]);
    }
    setSearchVal("");
    setQty(1);
    searchRef.current?.focus();
  };

  const handleAddBtn = () => {
    if (suggestions.length === 1) addProduct(suggestions[0]);
    else if (suggestions.length > 0) addProduct(suggestions[0]);
  };

  const removeLine = (id: number) =>
    setLines((ls) => ls.filter((l) => l.id !== id));

  const applyOverride = (id: number) => {
    setLines((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        const parsedRate = parseFloat(overridePrice);
        const rate =
          overridePrice !== "" && !isNaN(parsedRate) ? parsedRate : l.rate;
        const parsedTax = parseFloat(overrideTax);
        const taxPct =
          overrideTax !== "" && !isNaN(parsedTax) ? parsedTax : l.taxPct;
        return { ...l, rate, taxPct };
      }),
    );
    setOverrideLine(null);
    setOverridePrice("");
    setOverrideTax("");
  };

  const addQuickCharge = (c: (typeof QUICK_CHARGES)[0]) => {
    setExtraCharges((ec) => [
      ...ec,
      { id: Date.now(), label: c.label, amount: c.amount },
    ]);
  };
  const removeCharge = (id: number) =>
    setExtraCharges((ec) => ec.filter((c) => c.id !== id));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const totalTax = lines.reduce((s, l) => s + lineTax(l), 0);
  const extraTotal = extraCharges.reduce((s, c) => s + c.amount, 0);
  const grandTotal = subtotal + totalTax + extraTotal;
  const blackMarkup = saleType === "black" ? lines.reduce((s, l) => s + (l.rate - l.officialRate) * l.qty, 0) : 0;
  const creditLimit = Number(selectedCustomer?.creditLimit ?? 0);
  const creditBalance = Number(selectedCustomer?.creditBalance ?? 0);
  const creditRemaining = creditLimit - creditBalance;
  const creditNeedsApproval =
    saleType === "credit" &&
    !!customerId &&
    creditLimit > 0 &&
    creditBalance + grandTotal > creditLimit;
  const creditMissingCustomer = mode === "sales" && saleType === "credit" && !customerId;
  const deliveryPayload: DeliveryInfo | undefined = showDelivery
    ? Object.fromEntries(
        Object.entries(delivery).filter(([, v]) => String(v ?? "").trim() !== ""),
      )
    : undefined;

  const voidBill = () => {
    setLines([]);
    setExtraCharges([]);
    setCustomerInfo("");
    setCustomerId("");
    setSupplierRef("");
    setSearchVal("");
    setQty(1);
    setCashTendered("");
    setPaymentReference("");
    setCheckoutResult(null);
    setSaleType("normal");
    setCustomerType("regular");
    setPaymentTiming("cod");
    setPartialAmount("");
    setFacilitatorMode("none");
    setFacilitatorUserId("");
    setFacilitatorName("");
    setCommissionPct("");
    setFacilitatorSearchVal("");
    setShowDelivery(false);
    setDelivery({});
    setPrintDoc("receipt");
  };

  const closeSuccess = () => {
    setSuccess(null);
    voidBill();
    searchRef.current?.focus();
  };

  const cashShort =
    mode === "sales" &&
    payMethod === "cash" &&
    grandTotal > 0 &&
    (cashTendered === "" ||
      isNaN(Number(cashTendered)) ||
      Number(cashTendered) < grandTotal);

  const partialAmountMissing =
    mode === "sales" &&
    paymentTiming === "half" &&
    (partialAmount === "" ||
      isNaN(Number(partialAmount)) ||
      Number(partialAmount) <= 0);

  const buildLinePayload = () =>
    lines.map((l) => ({
      productId: l.productId,
      sku: l.sku,
      name: l.name,
      qty: l.qty,
      unitPrice: l.rate,
      taxPct: l.taxPct,
    }));

  const generateBill = async () => {
    if (lines.length === 0 || checkingOut || cashShort || partialAmountMissing) return;
    setCheckingOut(true);
    setCheckoutResult(null);
    try {
      const linePayload = buildLinePayload();

      const supplier = suppliers.find((s) => s.id === supplierId);

      const result =
        mode === "sales"
          ? await runSalesCheckout({
              storeName: stockLocation?.name,
              locationId: locationId || undefined,
              locationName: stockLocation?.name,
              inventory,
              orgId,
              customerId: customerId.trim() || undefined,
              paymentMethod: payMethod,
              paymentReference: paymentReference.trim() || undefined,
              amountReceived: cashTendered ? Number(cashTendered) : undefined,
              customerInfo,
              lines: linePayload,
              extraCharges,
              subtotal,
              taxAmount: totalTax,
              totalAmount: grandTotal,
              saleType,
              customerType,
              paymentTiming,
              partialAmount:
                paymentTiming === "half" ? Number(partialAmount) : undefined,
              creditLimit: selectedCustomer?.creditLimit ?? undefined,
              creditBalance: selectedCustomer?.creditBalance ?? undefined,
              delivery: deliveryPayload,
              facilitatorUserId: facilitatorMode === "user" ? facilitatorUserId : undefined,
              facilitatorName: facilitatorMode === "name" ? facilitatorName : undefined,
              commissionPct: commissionPct ? Number(commissionPct) : undefined,
            })
          : await runPurchaseCheckout({
              locationId,
              storeName: stockLocation?.name,
              locationName: stockLocation?.name,
              inventory,
              orgId,
              supplierId: supplierId || undefined,
              supplierName: supplier?.name,
              supplierRef,
              lines: linePayload,
              subtotal,
              taxAmount: totalTax,
              totalAmount: grandTotal,
            });

      setCheckoutResult(result);
      if (result.primaryOk) {
        setPrintDoc("receipt");
        setLastReceipt(result.receipt);
        setSuccess({ receipt: result.receipt, steps: result.steps });
      }
    } finally {
      setCheckingOut(false);
    }
  };

  // Reuses the bill-create path (create -> DRAFT) via checkout.ts's createDraftSale,
  // but never calls the COMPLETED transition — the bill stays a resumable draft.
  const holdSale = async () => {
    if (lines.length === 0 || holding || partialAmountMissing || !locationId) return;
    setHolding(true);
    setCheckoutResult(null);
    try {
      const result = await createDraftSale({
        storeName: stockLocation?.name,
        locationId: locationId || undefined,
        locationName: stockLocation?.name,
        inventory,
        orgId,
        customerId: customerId.trim() || undefined,
        paymentMethod: payMethod,
        paymentReference: paymentReference.trim() || undefined,
        amountReceived: cashTendered ? Number(cashTendered) : undefined,
        customerInfo,
        lines: buildLinePayload(),
        extraCharges,
        subtotal,
        taxAmount: totalTax,
        totalAmount: grandTotal,
        saleType,
        customerType,
        paymentTiming,
        partialAmount: paymentTiming === "half" ? Number(partialAmount) : undefined,
        creditLimit: selectedCustomer?.creditLimit ?? undefined,
        creditBalance: selectedCustomer?.creditBalance ?? undefined,
        delivery: deliveryPayload,
        facilitatorUserId: facilitatorMode === "user" ? facilitatorUserId : undefined,
        facilitatorName: facilitatorMode === "name" ? facilitatorName : undefined,
        commissionPct: commissionPct ? Number(commissionPct) : undefined,
      });
      if (result.billId) {
        toast.success(`Sale held as draft — ${result.receipt.ref}`);
        voidBill();
      } else {
        setCheckoutResult({ receipt: result.receipt, steps: result.steps, primaryOk: false });
      }
    } finally {
      setHolding(false);
    }
  };

  const resumeSale = async (billId: string) => {
    try {
      const bill = await get<Bill>(`/api/v1/bills/${billId}`);
      const items = bill.items ?? [];
      const products = await Promise.all(
        items.map((it) =>
          get<Product>(`/api/v1/products/${it.productId}`).catch(() => null),
        ),
      );
      setLines(
        items.map((it, idx) => {
          const p = products[idx];
          return {
            id: ++lineIdSeq,
            productId: it.productId,
            sku: p
              ? formatEntityLabel({ sku: p.sku, id: p.id })
              : it.productId.slice(0, 8),
            name: p?.name || "Item",
            qty: it.quantity,
            rate: it.unitPrice,
            taxPct: it.taxRate,
            unitLabel: p?.unit || "pcs",
            officialRate: p ? productRate(p, mode) : it.unitPrice,
          };
        }),
      );
      setCustomerId(bill.customerId || "");
      setCustomerInfo(
        bill.walkInName ||
          (bill.customerId ? `Customer ${bill.customerId.slice(0, 8)}…` : ""),
      );
      if (bill.locationId) setLocationId(bill.locationId);
      setSaleType((bill.saleType as SaleType) || "normal");
      setCustomerType((bill.customerType as CustomerType) || "regular");
      setPaymentTiming((bill.paymentTiming as PaymentTiming) || "cod");
      setPartialAmount(
        bill.partialAmount != null ? String(bill.partialAmount) : "",
      );
      setShowHeldSales(false);
      toast.success(`Resumed ${bill.billNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resume sale");
    }
  };

  const accentCls =
    mode === "sales"
      ? {
          btn: "bg-primary hover:bg-primary/90",
          light: "bg-primary/10 text-primary border-primary/30",
          badge: "bg-primary/15 text-primary",
        }
      : {
          btn: "bg-orange-500 hover:bg-orange-600",
          light: "bg-orange-50 text-orange-700 border-orange-200",
          badge: "bg-orange-100 text-orange-700",
        };

  const modeShellCls =
    mode === "sales" && saleType === "credit"
      ? "ring-1 ring-inset ring-amber-400/40 bg-amber-500/[0.04]"
      : mode === "sales" && saleType === "black"
        ? "ring-1 ring-inset ring-slate-400/40 bg-slate-500/[0.05]"
        : "";

  const handlePrintDoc = (doc: PrintDoc) => {
    setPrintDoc(doc);
    // Let React paint the selected print root before opening the dialog.
    requestAnimationFrame(() => printReceipt());
  };

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted ${modeShellCls}`}>
      <div className="flex items-center gap-4 px-5 py-3 bg-card border-b border-border flex-shrink-0 flex-wrap">
        <ModeToggle
          mode={mode}
          onChange={(m) => {
            setMode(m);
            voidBill();
            setSupplierId("");
          }}
        />

        {mode === "sales" && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <SaleTypeToggle
              saleType={saleType}
              onChange={setSaleType}
              canCreateBlackSale={canCreateBlackSale}
            />
          </>
        )}

        <div className="w-px h-6 bg-border mx-1" />

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
            <DropdownMenuRadioGroup value={locationId} onValueChange={setLocationId}>
              {locations.map((l) => (
                <DropdownMenuRadioItem key={l.id} value={l.id}>
                  {l.name} ({l.type.charAt(0).toUpperCase() + l.type.slice(1)})
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {mode === "sales" && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PosPayMethod)}
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
              onChange={setPaymentTiming}
            />
            <CustomerTypeRow
              customerType={customerType}
              onChange={setCustomerType}
            />
          </>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span
            className={`px-2 py-1 rounded-md font-medium ${accentCls.badge}`}
          >
            {mode === "sales" ? "SALES MODE" : "PURCHASE MODE"}
          </span>
        </div>
      </div>

      {/* // <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
      //   Stock uses Locations (header right of Store). Sales create a bill then DRAFT → COMPLETED (stock
      //   deducted on the server). Walk-in needs a name; or pick a customer from search.
      // </div> */}

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        <div className="flex w-64 min-h-0 flex-shrink-0 flex-col overflow-y-auto bg-card border-r border-border">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              {mode === "sales" ? "Add Product" : "Receive Product"}
            </p>
            <div className="relative">
              <Scan
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchRef}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBtn()}
                placeholder="SKU or product name..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => setSearchVal("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden shadow-lg bg-card z-10 relative">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-primary/10 border-b border-border last:border-0 transition"
                  >
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Package size={13} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {formatEntityLabel({ sku: p.sku, id: p.id })}
                      </p>
                      <span className="text-[10px] font-semibold text-primary">
                        {fmt(productRate(p, mode))}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center border border-border rounded-lg overflow-hidden flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-2.5 py-2 hover:bg-muted text-muted-foreground transition"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  onChange={(e) =>
                    setQty(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-12 text-center text-sm font-semibold border-x border-border py-2 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-2.5 py-2 hover:bg-muted text-muted-foreground transition"
                >
                  <Plus size={13} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddBtn}
                className={`flex-1 py-2 rounded-lg text-white text-sm font-semibold transition ${accentCls.btn}`}
              >
                Add
              </button>
            </div>
          </div>

          {mode === "sales" && (
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Quick Charges
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_CHARGES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => addQuickCharge(c)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition text-left ${
                      c.amount < 0
                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-border bg-muted text-foreground hover:bg-muted"
                    }`}
                  >
                    {c.label}
                    <span
                      className={`block text-[10px] font-mono ${c.amount < 0 ? "text-red-500" : "text-muted-foreground"}`}
                    >
                      {c.amount < 0 ? "-" : "+"}${Math.abs(c.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "purchase" && (
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Supplier
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground font-medium focus:outline-none focus:border-orange-400"
                  >
                    <span className="truncate">
                      {supplierId
                        ? (suppliers.find((s: Supplier) => s.id === supplierId)?.name ?? "Select Supplier")
                        : "— Select Supplier —"}
                    </span>
                    <ChevronDown size={13} className="text-muted-foreground flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full max-h-64 overflow-y-auto">
                  <DropdownMenuRadioGroup value={supplierId} onValueChange={setSupplierId}>
                    {suppliers.map((s: Supplier) => (
                      <DropdownMenuRadioItem key={s.id} value={s.id}>
                        {s.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="mt-auto p-4 space-y-2">
            <Link
              to="/bills"
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition"
            >
              <Receipt size={14} />
              {mode === "sales" ? "Bill History" : "Bills"}
            </Link>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              {mode === "sales" ? (
                <ShoppingCart size={16} className="text-primary" />
              ) : (
                <PackagePlus size={16} className="text-orange-500" />
              )}
              <span className="font-semibold text-foreground">
                {mode === "sales" ? "Current Sale" : "Purchase Order Items"}
              </span>
              {lines.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${accentCls.badge}`}
                >
                  {lines.length} item{lines.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={voidBill}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                <X size={13} /> Void
              </button>
              {mode === "sales" && (
                <>
                  <button
                    type="button"
                    onClick={() => void holdSale()}
                    disabled={lines.length === 0 || holding || partialAmountMissing || !locationId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PauseCircle size={13} /> {holding ? "Holding…" : "Hold"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHeldSales(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition"
                  >
                    <Archive size={13} /> Held Sales
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-3">
                {mode === "sales" ? (
                  <ShoppingCart size={40} strokeWidth={1.2} />
                ) : (
                  <PackagePlus size={40} strokeWidth={1.2} />
                )}
                <p className="text-sm font-medium text-muted-foreground">
                  {mode === "sales"
                    ? "Search or scan a product to start a sale"
                    : "Search a product to add to the purchase order"}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted border-b border-border z-10">
                  <tr>
                    {(saleType === "black"
                      ? ["#", "SKU", "Description", "Qty", "Official", "Charged", "Tax", "Total", ""]
                      : ["#", "SKU", "Description", "Qty", "Rate", "Tax", "Total", ""]
                    ).map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-muted/60 group">
                      <td className="px-3 py-3 text-muted-foreground text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                        {line.sku}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-foreground font-medium text-sm">
                          {line.name}
                        </p>
                        {saleType !== "black" &&
                          (overrideLine === line.id ? (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <input
                              type="number"
                              value={overridePrice}
                              onChange={(e) => setOverridePrice(e.target.value)}
                              placeholder={`Rate (${line.rate})`}
                              className="w-24 text-xs px-2 py-1 border border-amber-300 rounded outline-none focus:border-amber-500 bg-amber-50"
                            />
                            <select
                              value={overrideTax}
                              onChange={(e) => setOverrideTax(e.target.value)}
                              className="text-xs px-2 py-1 border border-amber-300 rounded outline-none bg-amber-50"
                            >
                              <option value="">
                                Tax as-is ({line.taxPct}%)
                              </option>
                              {TAXES_LIST.map((t) => (
                                <option key={t.pct} value={t.pct}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => applyOverride(line.id)}
                              className="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600"
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => setOverrideLine(null)}
                              className="text-muted-foreground hover:text-muted-foreground"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setOverrideLine(line.id);
                              setOverridePrice(String(line.rate));
                              setOverrideTax(String(line.taxPct));
                            }}
                            className="hidden group-hover:flex items-center gap-1 text-[10px] text-amber-600 hover:underline mt-0.5"
                          >
                            Override price / tax
                          </button>
                        ))}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-foreground">{line.qty}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {line.unitLabel}
                        </p>
                      </td>
                      {saleType === "black" ? (
                        <>
                          <td className="px-3 py-3 text-muted-foreground tabular-nums">
                            {fmt(line.officialRate)}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={line.rate}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                setLines((ls) =>
                                  ls.map((l) =>
                                    l.id === line.id
                                      ? { ...l, rate: isNaN(v) ? l.rate : v }
                                      : l,
                                  ),
                                );
                              }}
                              className="w-24 text-sm px-2 py-1 border border-border rounded-lg outline-none focus:border-primary tabular-nums"
                            />
                          </td>
                        </>
                      ) : (
                        <td className="px-3 py-3 text-foreground">
                          {fmt(line.rate)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-muted-foreground text-xs">
                        {line.taxPct > 0 ? (
                          <span>
                            {line.taxPct}%{" "}
                            <span className="text-muted-foreground">
                              ({fmt(lineTax(line))})
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-foreground">
                        {fmt(lineTotal(line))}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground/50 hover:text-red-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {extraCharges.map((ec) => (
                    <tr key={ec.id} className="bg-muted/40">
                      <td />
                      <td />
                      <td className="px-3 py-2 text-xs text-muted-foreground italic">
                        {ec.label}
                      </td>
                      <td />
                      <td />
                      <td />
                      <td
                        className={`px-3 py-2 text-sm font-semibold ${ec.amount < 0 ? "text-red-600" : "text-foreground"}`}
                      >
                        {ec.amount < 0 ? "-" : "+"}
                        {fmt(Math.abs(ec.amount))}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeCharge(ec.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground/50 hover:text-red-500 transition"
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {checkoutResult && !success && (
            <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 flex-shrink-0">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle
                  size={14}
                  className="text-amber-700 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs font-semibold text-amber-800">
                  Checkout did not complete — cart kept. Fix the failed steps:
                </p>
              </div>
              <StepList steps={checkoutResult.steps} />
            </div>
          )}
        </div>

        <div className="flex w-72 min-h-0 flex-shrink-0 flex-col overflow-hidden bg-card border-l border-border">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {mode === "sales" ? "Checkout" : "Order Summary"}
            </p>
            <span className="text-sm font-bold text-primary tabular-nums">
              {fmt(grandTotal)}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Items</span>
                <span className="font-medium text-foreground">{lines.length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Tax</span>
                <span className="font-medium text-foreground">{fmt(totalTax)}</span>
              </div>
              {extraCharges.length > 0 && (
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Extra Charges</span>
                  <span
                    className={`font-medium ${extraTotal < 0 ? "text-red-600" : "text-foreground"}`}
                  >
                    {extraTotal < 0 ? "-" : "+"}
                    {fmt(Math.abs(extraTotal))}
                  </span>
                </div>
              )}
              {mode === "sales" && saleType === "black" && (
                <div className="flex justify-between text-slate-600 dark:text-slate-300 text-xs pt-0.5">
                  <span className="font-semibold uppercase tracking-wide">Black markup</span>
                  <span className="font-semibold tabular-nums">{fmt(blackMarkup)}</span>
                </div>
              )}
            </div>

            {mode === "sales" && (
              <div className="space-y-2">
                {payMethod === "cash" && grandTotal > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Cash Tendered
                    </label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="Enter amount received"
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
                    />
                    {cashTendered !== "" && !isNaN(Number(cashTendered)) && (
                      <div
                        className={`text-xs font-medium ${Number(cashTendered) < grandTotal ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {Number(cashTendered) < grandTotal
                          ? `Short by ${fmt(grandTotal - Number(cashTendered))}`
                          : `Change due: ${fmt(Number(cashTendered) - grandTotal)}`}
                      </div>
                    )}
                  </div>
                )}
                {payMethod !== "cash" && (
                  <div>
                    <label className="block mb-1 text-xs font-medium text-muted-foreground">
                      {payMethod === "till" ? "Till number / ref" : "Payment reference"}
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder={
                        payMethod === "mpesa"
                          ? "M-Pesa code"
                          : payMethod === "till"
                            ? "Till number"
                            : "Reference"
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-primary"
                    />
                  </div>
                )}
                {paymentTiming === "half" && (
                  <div>
                    <input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="Partial amount received"
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary ${
                        partialAmountMissing ? "border-destructive" : "border-border"
                      }`}
                    />
                    {partialAmountMissing && (
                      <p className="mt-1 text-[10px] font-medium text-destructive">
                        Enter a partial amount greater than 0
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowDelivery((v) => !v)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                >
                  {showDelivery ? "− Hide delivery info" : "+ Delivery info"}
                </button>
                {showDelivery && (
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["driverName", "Driver name"],
                        ["companionName", "With driver"],
                        ["vehicleNumber", "Vehicle no."],
                        ["license", "License"],
                        ["location", "Location"],
                        ["distance", "Distance"],
                        ["gps", "GPS"],
                        ["rating", "Rating"],
                        ["note", "Note"],
                      ] as Array<[keyof DeliveryInfo, string]>
                    ).map(([key, label]) => (
                      <input
                        key={key}
                        type="text"
                        value={delivery[key] ?? ""}
                        onChange={(e) =>
                          setDelivery((d) => ({ ...d, [key]: e.target.value }))
                        }
                        placeholder={label}
                        className={`px-2 py-1.5 border border-border rounded-lg text-xs outline-none focus:border-primary ${
                          key === "note" ? "col-span-2" : ""
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                {mode === "sales" ? "Customer" : "Supplier Ref. / Notes"}
              </p>
              <div className="relative">
                <User
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
                />
                <input
                  value={mode === "sales" ? customerInfo : supplierRef}
                  onChange={(e) => {
                    if (mode === "sales") {
                      setCustomerInfo(e.target.value);
                      setCustomerId("");
                      setShowCustomerSuggestions(true);
                    } else {
                      setSupplierRef(e.target.value);
                    }
                  }}
                  onFocus={() =>
                    mode === "sales" && setShowCustomerSuggestions(true)
                  }
                  placeholder={
                    mode === "sales"
                      ? "Walk-in name or search customer…"
                      : "Supplier invoice / LPO no."
                  }
                  className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-primary"
                />
                {mode === "sales" &&
                  showCustomerSuggestions &&
                  !customerId &&
                  debouncedCustomerInfo.trim().length >= 2 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                      {(customerSearch?.items ?? []).map((c: Customer) => (
                        <button
                          key={c.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border last:border-0"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerInfo(
                              formatEntityLabel({
                                name: c.name,
                                phone: c.phone,
                                id: c.id,
                              }),
                            );
                            setCustomerType((c.customerType as CustomerType) || "regular");
                            setShowCustomerSuggestions(false);
                          }}
                        >
                          <span className="font-medium">
                            {c.name || "Unnamed"}
                          </span>
                          {c.phone ? (
                            <span className="text-xs text-muted-foreground ml-2">
                              {c.phone}
                            </span>
                          ) : null}
                        </button>
                      ))}
                      {(customerSearch?.items?.length ?? 0) === 0 && (
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setShowCreateCustomer(true);
                            setShowCustomerSuggestions(false);
                          }}
                        >
                          No customer found for &quot;{customerInfo.trim()}&quot; —{" "}
                          <span className="font-medium text-primary">
                            + Create customer
                          </span>
                        </button>
                      )}
                    </div>
                  )}
              </div>
              {mode === "sales" && (
                <CustomerFormDrawer
                  open={showCreateCustomer}
                  initialName={customerInfo.trim()}
                  onClose={() => setShowCreateCustomer(false)}
                  onSaved={(customer) => {
                    setCustomerId(customer.id);
                    setCustomerInfo(
                      formatEntityLabel({
                        name: customer.name,
                        phone: customer.phone,
                        id: customer.id,
                      }),
                    );
                    setCustomerType((customer.customerType as CustomerType) || "new");
                    setShowCreateCustomer(false);
                  }}
                />
              )}
              {mode === "sales" && customerId && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground truncate">
                    Linked:{" "}
                    {formatEntityLabel({ name: customerInfo, id: customerId })}
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground underline"
                    onClick={() => {
                      setCustomerId("");
                      setCustomerInfo("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
              {mode === "sales" && saleType === "credit" && !customerId && (
                <p className="mt-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  Select a customer for credit sales
                </p>
              )}
              {mode === "sales" &&
                saleType === "credit" &&
                customerId &&
                selectedCustomer && (
                  <div className="mt-2 rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 space-y-1 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Limit</span>
                      <span className="font-semibold tabular-nums">{fmt(creditLimit)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-semibold tabular-nums">{fmt(creditBalance)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-semibold tabular-nums">{fmt(creditRemaining)}</span>
                    </div>
                    {creditNeedsApproval && (
                      <p className="pt-1 font-semibold text-amber-800 dark:text-amber-300">
                        Needs approval — over credit limit
                      </p>
                    )}
                  </div>
                )}

              {mode === "sales" && saleType === "black" && (
                <div className="mt-3 space-y-2">
                  <div className="p-2.5 border rounded-xl bg-muted/40 border-border/80">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                      Facilitator & Commission
                    </p>
                    <select
                      value={facilitatorMode}
                      onChange={(e) =>
                        setFacilitatorMode(e.target.value as "none" | "user" | "name")
                      }
                      className="mb-2 w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-card outline-none focus:border-primary"
                    >
                      <option value="none">None</option>
                      <option value="user">System User</option>
                      <option value="name">Name Only</option>
                    </select>

                    {facilitatorMode === "user" && (
                      <div className="relative mb-2">
                        <input
                          value={facilitatorSearchVal}
                          onChange={(e) => {
                            setFacilitatorSearchVal(e.target.value);
                            setFacilitatorUserId("");
                            setShowFacilitatorSuggestions(true);
                          }}
                          onFocus={() => setShowFacilitatorSuggestions(true)}
                          placeholder="Search user..."
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary"
                        />
                        {showFacilitatorSuggestions && !facilitatorUserId && (facilitatorSearch?.data?.length ?? 0) > 0 && (
                          <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                            {(facilitatorSearch?.data ?? []).map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                className="block w-full px-2 py-1.5 text-left text-[11px] hover:bg-muted border-b border-border last:border-0"
                                onClick={() => {
                                  setFacilitatorUserId(u.id);
                                  setFacilitatorSearchVal(`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email);
                                  setShowFacilitatorSuggestions(false);
                                }}
                              >
                                {u.firstName} {u.lastName} <span className="text-muted-foreground">{u.email}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {facilitatorMode === "name" && (
                      <div className="mb-2">
                        <input
                          value={facilitatorName}
                          onChange={(e) => setFacilitatorName(e.target.value)}
                          placeholder="Facilitator name"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary"
                        />
                      </div>
                    )}
                    {facilitatorMode !== "none" && (
                      <div>
                        <input
                          type="number"
                          value={commissionPct}
                          onChange={(e) => setCommissionPct(e.target.value)}
                          placeholder="Commission %"
                          className="w-full px-2 py-1.5 text-xs border border-border rounded-lg outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                  {facilitatorMode !== "none" && commissionPct && (
                    <div className="p-2 border border-border/80 bg-background rounded-lg flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Est. Commission</span>
                      <span className="font-semibold text-primary">{fmt((blackMarkup * Number(commissionPct)) / 100)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-border space-y-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => void generateBill()}
              disabled={
                lines.length === 0 ||
                checkingOut ||
                cashShort ||
                partialAmountMissing ||
                creditMissingCustomer ||
                (mode === "sales" && !locationId) ||
                (mode === "purchase" && !supplierId)
              }
              className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${accentCls.btn}`}
            >
              {mode === "sales" ? (
                <Receipt size={16} />
              ) : (
                <PackagePlus size={16} />
              )}
              {checkingOut
                ? "Processing…"
                : mode === "sales"
                  ? creditNeedsApproval
                    ? "Request approval"
                    : "Complete Sale"
                  : "Create Purchase Order"}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={printReceipt}
                disabled={!lastReceipt && !success}
                title={
                  lastReceipt || success
                    ? "Print last receipt"
                    : mode === "sales"
                      ? "Complete a sale first"
                      : "Create a purchase order first"
                }
                className="flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={13} /> Print
              </button>
              <button
                type="button"
                disabled
                title="E-receipt not wired"
                className="flex items-center justify-center gap-1.5 py-2 border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
              >
                <Mail size={13} /> E-Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <BillSuccessModal
          receipt={success.receipt}
          steps={success.steps}
          printDoc={printDoc}
          onPrintDoc={handlePrintDoc}
          onClose={closeSuccess}
        />
      )}

      {(success?.receipt || lastReceipt) && (
        <div className="pos-print-root" aria-hidden>
          {(() => {
            const r = success?.receipt ?? lastReceipt!;
            if (printDoc === "debtor") return <DebtorNoteDocument receipt={r} />;
            if (printDoc === "statement") return <StatementDocument receipt={r} />;
            if (printDoc === "delivery") return <DeliveryNoteDocument receipt={r} />;
            return <ReceiptDocument receipt={r} />;
          })()}
        </div>
      )}

      {showHeldSales && (
        <HeldSalesPanel
          locationId={locationId}
          onClose={() => setShowHeldSales(false)}
          onResume={(billId) => void resumeSale(billId)}
        />
      )}
    </div>
  );
}
