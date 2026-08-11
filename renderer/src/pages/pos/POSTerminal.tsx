import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
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
  ClerkUser,
  Customer,
  CustomerType,
  Location,
  PaymentTiming,
  Product,
  SaleType,
} from "../../types";
import { useDebounce } from "../../hooks/useDebounce";
import { formatEntityLabel } from "../../lib/entityLabel";
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
import { HeldSalesPanel } from "./HeldSalesPanel";
import { productRate, type BillLine, type ExtraCharge, type Mode, type PrintDoc } from "./posHelpers";
import { PosToolbar } from "./components/PosToolbar";
import { ProductSearchPanel } from "./components/ProductSearchPanel";
import { CartTable } from "./components/CartTable";
import { CheckoutPanel } from "./components/CheckoutPanel";
import { StepList } from "./components/StepList";
import type { QuickCharge } from "./components/ProductSearchPanel";

let lineIdSeq = 100;

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
  const [payMethod, setPayMethod] = useState<PosPayMethod>("cash");
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
  /** Bill id being edited via Resume — checkout completes THIS bill instead of creating a new one. */
  const [activeDraftBillId, setActiveDraftBillId] = useState<string | null>(null);
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
    if (suggestions.length > 0) addProduct(suggestions[0]);
  };

  const removeLine = (id: number) =>
    setLines((ls) => ls.filter((l) => l.id !== id));

  const handleLineQtyChange = (lineId: number, newQty: number) => {
    setLines((ls) =>
      ls.map((l) => (l.id === lineId ? { ...l, qty: Math.max(1, newQty) } : l)),
    );
  };

  const handleBlackRateChange = (lineId: number, rate: number) => {
    setLines((ls) => ls.map((l) => (l.id === lineId ? { ...l, rate } : l)));
  };

  const handleStartOverride = (line: BillLine) => {
    setOverrideLine(line.id);
    setOverridePrice(String(line.rate));
    setOverrideTax(String(line.taxPct));
  };

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

  const addQuickCharge = (c: QuickCharge) => {
    setExtraCharges((ec) => [
      ...ec,
      { id: Date.now(), label: c.label, amount: c.amount },
    ]);
  };
  const removeCharge = (id: number) =>
    setExtraCharges((ec) => ec.filter((c) => c.id !== id));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const totalTax = lines.reduce((s, l) => s + (l.qty * l.rate * l.taxPct) / 100, 0);
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
    setActiveDraftBillId(null);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    voidBill();
    setSupplierId("");
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
              existingBillId: activeDraftBillId ?? undefined,
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
        existingBillId: activeDraftBillId ?? undefined,
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
      setActiveDraftBillId(bill.id);
      toast.success(`Resumed ${bill.billNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resume sale");
    }
  };

  const handleCustomerSelect = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerInfo(
      formatEntityLabel({ name: c.name, phone: c.phone, id: c.id }),
    );
    setCustomerType((c.customerType as CustomerType) || "regular");
    setShowCustomerSuggestions(false);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerInfo(
      formatEntityLabel({ name: customer.name, phone: customer.phone, id: customer.id }),
    );
    setCustomerType((customer.customerType as CustomerType) || "new");
    setShowCreateCustomer(false);
  };

  const handleClearCustomer = () => {
    setCustomerId("");
    setCustomerInfo("");
  };

  const handleCustomerInfoChange = (v: string) => {
    setCustomerInfo(v);
    setCustomerId("");
  };

  const handleFacilitatorUserSelect = (u: ClerkUser) => {
    setFacilitatorUserId(u.id);
    setFacilitatorSearchVal(`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email);
    setShowFacilitatorSuggestions(false);
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

  const generateDisabled =
    lines.length === 0 ||
    checkingOut ||
    cashShort ||
    partialAmountMissing ||
    creditMissingCustomer ||
    (mode === "sales" && !locationId) ||
    (mode === "purchase" && !supplierId);

  const holdDisabled =
    lines.length === 0 || holding || partialAmountMissing || !locationId;

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted ${modeShellCls}`}>
      <PosToolbar
        mode={mode}
        onModeChange={handleModeChange}
        saleType={saleType}
        onSaleTypeChange={setSaleType}
        canCreateBlackSale={canCreateBlackSale}
        locations={locations}
        locationsLoading={locationsLoading}
        locationId={locationId}
        onLocationChange={setLocationId}
        stockLocation={stockLocation}
        payMethod={payMethod}
        onPayMethodChange={setPayMethod}
        paymentTiming={paymentTiming}
        onPaymentTimingChange={setPaymentTiming}
        customerType={customerType}
        onCustomerTypeChange={setCustomerType}
        badgeCls={accentCls.badge}
      />

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        <ProductSearchPanel
          mode={mode}
          searchRef={searchRef}
          searchVal={searchVal}
          onSearchChange={setSearchVal}
          onEnter={handleAddBtn}
          suggestions={suggestions}
          onAddProduct={addProduct}
          qty={qty}
          onQtyChange={setQty}
          onAddBtn={handleAddBtn}
          onAddQuickCharge={addQuickCharge}
          supplierId={supplierId}
          onSupplierChange={setSupplierId}
          suppliers={suppliers}
          accentBtnCls={accentCls.btn}
        />

        <CartTable
          mode={mode}
          saleType={saleType}
          lines={lines}
          extraCharges={extraCharges}
          onQtyChange={handleLineQtyChange}
          onBlackRateChange={handleBlackRateChange}
          onRemoveLine={removeLine}
          onRemoveCharge={removeCharge}
          overrideLine={overrideLine}
          overridePrice={overridePrice}
          overrideTax={overrideTax}
          onStartOverride={handleStartOverride}
          onOverridePriceChange={setOverridePrice}
          onOverrideTaxChange={setOverrideTax}
          onApplyOverride={applyOverride}
          onCancelOverride={() => setOverrideLine(null)}
          onVoidBill={voidBill}
          onHoldSale={() => void holdSale()}
          holding={holding}
          holdDisabled={holdDisabled}
          onShowHeldSales={() => setShowHeldSales(true)}
          checkoutResult={checkoutResult}
          showCheckoutFailureBanner={!!checkoutResult && !success}
          accentBadgeCls={accentCls.badge}
        />

        <CheckoutPanel
          mode={mode}
          saleType={saleType}
          lineCount={lines.length}
          subtotal={subtotal}
          totalTax={totalTax}
          extraTotal={extraTotal}
          grandTotal={grandTotal}
          blackMarkup={blackMarkup}
          payMethod={payMethod}
          cashTendered={cashTendered}
          onCashTenderedChange={setCashTendered}
          paymentReference={paymentReference}
          onPaymentReferenceChange={setPaymentReference}
          paymentTiming={paymentTiming}
          partialAmount={partialAmount}
          onPartialAmountChange={setPartialAmount}
          partialAmountMissing={partialAmountMissing}
          showDelivery={showDelivery}
          onToggleDelivery={() => setShowDelivery((v) => !v)}
          delivery={delivery}
          onDeliveryChange={setDelivery}
          customerInfo={customerInfo}
          onCustomerInfoChange={handleCustomerInfoChange}
          customerId={customerId}
          onCustomerSelect={handleCustomerSelect}
          onClearCustomer={handleClearCustomer}
          showCustomerSuggestions={showCustomerSuggestions}
          onShowCustomerSuggestions={setShowCustomerSuggestions}
          debouncedCustomerInfo={debouncedCustomerInfo}
          customerSearchItems={customerSearch?.items ?? []}
          showCreateCustomer={showCreateCustomer}
          onOpenCreateCustomer={() => {
            setShowCreateCustomer(true);
            setShowCustomerSuggestions(false);
          }}
          onCloseCreateCustomer={() => setShowCreateCustomer(false)}
          onCustomerCreated={handleCustomerCreated}
          selectedCustomer={selectedCustomer}
          creditLimit={creditLimit}
          creditBalance={creditBalance}
          creditRemaining={creditRemaining}
          creditNeedsApproval={creditNeedsApproval}
          facilitatorMode={facilitatorMode}
          onFacilitatorModeChange={setFacilitatorMode}
          facilitatorSearchVal={facilitatorSearchVal}
          onFacilitatorSearchChange={(v) => {
            setFacilitatorSearchVal(v);
            setFacilitatorUserId("");
          }}
          facilitatorUserId={facilitatorUserId}
          onFacilitatorUserSelect={handleFacilitatorUserSelect}
          showFacilitatorSuggestions={showFacilitatorSuggestions}
          onShowFacilitatorSuggestions={setShowFacilitatorSuggestions}
          facilitatorSearchResults={facilitatorSearch?.data ?? []}
          facilitatorName={facilitatorName}
          onFacilitatorNameChange={setFacilitatorName}
          commissionPct={commissionPct}
          onCommissionPctChange={setCommissionPct}
          supplierRef={supplierRef}
          onSupplierRefChange={setSupplierRef}
          onGenerateBill={() => void generateBill()}
          generateDisabled={generateDisabled}
          checkingOut={checkingOut}
          onPrintReceipt={printReceipt}
          hasReceipt={!!lastReceipt || !!success}
          accentBtnCls={accentCls.btn}
        />
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
          onClose={() => setShowHeldSales(false)}
          onResume={(bill) => void resumeSale(bill.id)}
        />
      )}
    </div>
  );
}
