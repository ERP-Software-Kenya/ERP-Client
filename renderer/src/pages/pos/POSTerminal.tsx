import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Check,
  CreditCard,
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
  Store as StoreIcon,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Products, Stores, Suppliers } from '../../api';
import type { Product, Store, Supplier } from '../../types';
import {
  runPurchaseCheckout,
  runSalesCheckout,
  type CheckoutResult,
  type CheckoutStep,
  type PosReceipt,
} from './checkout';
import { ReceiptDocument } from './ReceiptDocument';

type Mode = 'sales' | 'purchase';
type PayMethod = 'cash' | 'card';

interface BillLine {
  id: number;
  productId: string;
  sku: string;
  name: string;
  qty: number;
  rate: number;
  taxPct: number;
  unitLabel: string;
}

interface ExtraCharge {
  id: number;
  label: string;
  amount: number;
}

const QUICK_CHARGES = [
  { label: 'Delivery Fee', amount: 200 },
  { label: 'Packaging', amount: 50 },
  { label: 'Store Credit', amount: -100 },
  { label: 'Discount', amount: -50 },
];

const TAXES_LIST = [
  { name: 'VAT 16%', pct: 16 },
  { name: 'VAT 8%', pct: 8 },
  { name: 'None', pct: 0 },
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

function storeOrgId(store: Store | undefined): string | undefined {
  if (!store) return undefined;
  const s = store as Store & { organizationId?: string };
  return s.organizationId ?? store.organization_id;
}

function productRate(p: Product, mode: Mode): number {
  if (mode === 'purchase') return Number(p.costPrice ?? p.wholesalePrice ?? p.retailPrice ?? 0);
  return Number(p.retailPrice ?? p.wholesalePrice ?? p.costPrice ?? 0);
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('sales')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          mode === 'sales' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <ShoppingCart size={14} />
        Sales Billing
      </button>
      <button
        type="button"
        onClick={() => onChange('purchase')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          mode === 'purchase' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <PackagePlus size={14} />
        Purchase Receiving
      </button>
    </div>
  );
}

function StepList({ steps }: { steps: CheckoutStep[] }) {
  return (
    <ul className="text-left space-y-1.5 max-h-40 overflow-y-auto">
      {steps.map((s) => (
        <li key={s.name} className="text-xs border border-slate-100 rounded-lg px-2.5 py-1.5">
          <span
            className={`font-semibold uppercase tracking-wide mr-2 ${
              s.status === 'ok' ? 'text-green-600' : s.status === 'failed' ? 'text-red-600' : 'text-amber-600'
            }`}
          >
            {s.status}
          </span>
          <span className="font-medium text-slate-800">{s.name}</span>
          {s.message && <p className="text-slate-500 mt-0.5 break-words">{s.message}</p>}
        </li>
      ))}
    </ul>
  );
}

function printReceipt() {
  window.print();
}

function BillSuccessModal({
  receipt,
  steps,
  onClose,
}: {
  receipt: PosReceipt;
  steps: CheckoutStep[];
  onClose: () => void;
}) {
  const hasGaps = steps.some((s) => s.status === 'failed' || s.status === 'skipped');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pos-no-print">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Check size={26} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {receipt.mode === 'sales' ? 'Bill ready' : 'Receipt ready'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {receipt.synced
              ? 'Synced to server where possible'
              : 'Local receipt — print now; server sync pending API gaps'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
          <ReceiptDocument receipt={receipt} />
        </div>

        {hasGaps && (
          <div className="mb-4 text-left">
            <p className="text-xs font-semibold text-amber-700 mb-2">API steps (informational)</p>
            <StepList steps={steps} />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={printReceipt}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer size={15} /> Print receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            New Bill
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSTerminal() {
  const [mode, setMode] = useState<Mode>('sales');
  const [storeId, setStoreId] = useState('');
  const [lines, setLines] = useState<BillLine[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [qty, setQty] = useState(1);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [customerInfo, setCustomerInfo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [overrideLine, setOverrideLine] = useState<number | null>(null);
  const [overridePrice, setOverridePrice] = useState('');
  const [overrideTax, setOverrideTax] = useState('');
  const [success, setSuccess] = useState<{ receipt: PosReceipt; steps: CheckoutStep[] } | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showAdvancedCustomer, setShowAdvancedCustomer] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: stores = [], isLoading: storesLoading } = Stores.useList();
  const { data: suppliers = [] } = Suppliers.useList(mode === 'purchase');
  const { data: productSearch } = Products.useSearch({
    page: 1,
    limit: 20,
    search: searchVal.trim() || undefined,
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const store = useMemo(() => stores.find((s) => s.id === storeId), [stores, storeId]);
  const orgId = storeOrgId(store);

  const suggestions: Product[] = useMemo(() => {
    if (!searchVal.trim()) return [];
    const items = productSearch?.items ?? [];
    const q = searchVal.toLowerCase();
    return items
      .filter(
        (p) =>
          (p.name ?? '').toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          (p.barcode ?? '').toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [productSearch, searchVal]);

  const addProduct = (p: Product) => {
    const sku = p.sku || p.id.slice(0, 8);
    const existing = lines.find((l) => l.productId === p.id);
    if (existing) {
      setLines((ls) => ls.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + qty } : l)));
    } else {
      setLines((ls) => [
        ...ls,
        {
          id: ++lineIdSeq,
          productId: p.id,
          sku,
          name: p.name || 'Unnamed product',
          qty,
          rate: productRate(p, mode),
          taxPct: 0,
          unitLabel: p.unit || 'pcs',
        },
      ]);
    }
    setSearchVal('');
    setQty(1);
    searchRef.current?.focus();
  };

  const handleAddBtn = () => {
    if (suggestions.length === 1) addProduct(suggestions[0]);
    else if (suggestions.length > 0) addProduct(suggestions[0]);
  };

  const updateQty = (id: number, delta: number) => {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty + delta) } : l)));
  };

  const removeLine = (id: number) => setLines((ls) => ls.filter((l) => l.id !== id));

  const applyOverride = (id: number) => {
    setLines((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        const rate = parseFloat(overridePrice) || l.rate;
        const taxPct = overrideTax !== '' ? parseFloat(overrideTax) : l.taxPct;
        return { ...l, rate, taxPct };
      }),
    );
    setOverrideLine(null);
    setOverridePrice('');
    setOverrideTax('');
  };

  const addQuickCharge = (c: (typeof QUICK_CHARGES)[0]) => {
    setExtraCharges((ec) => [...ec, { id: Date.now(), label: c.label, amount: c.amount }]);
  };
  const removeCharge = (id: number) => setExtraCharges((ec) => ec.filter((c) => c.id !== id));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const totalTax = lines.reduce((s, l) => s + lineTax(l), 0);
  const extraTotal = extraCharges.reduce((s, c) => s + c.amount, 0);
  const grandTotal = subtotal + totalTax + extraTotal;

  const voidBill = () => {
    setLines([]);
    setExtraCharges([]);
    setCustomerInfo('');
    setCustomerId('');
    setSupplierRef('');
    setSearchVal('');
    setQty(1);
    setCashTendered('');
    setCheckoutResult(null);
  };

  const closeSuccess = () => {
    setSuccess(null);
    voidBill();
    searchRef.current?.focus();
  };

  const generateBill = async () => {
    if (lines.length === 0 || checkingOut) return;
    setCheckingOut(true);
    setCheckoutResult(null);
    try {
      const linePayload = lines.map((l) => ({
        productId: l.productId,
        sku: l.sku,
        name: l.name,
        qty: l.qty,
        unitPrice: l.rate,
        taxPct: l.taxPct,
      }));

      const supplier = suppliers.find((s) => s.id === supplierId);

      const result =
        mode === 'sales'
          ? await runSalesCheckout({
              storeId,
              storeName: store?.name,
              orgId,
              customerId: customerId.trim() || undefined,
              paymentMethod: payMethod,
              amountReceived: cashTendered ? Number(cashTendered) : undefined,
              customerInfo,
              lines: linePayload,
              extraCharges,
              subtotal,
              taxAmount: totalTax,
              totalAmount: grandTotal,
            })
          : await runPurchaseCheckout({
              storeId,
              storeName: store?.name,
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
        setLastReceipt(result.receipt);
        setSuccess({ receipt: result.receipt, steps: result.steps });
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const accentCls =
    mode === 'sales'
      ? {
          btn: 'bg-blue-600 hover:bg-blue-700',
          light: 'bg-blue-50 text-blue-700 border-blue-200',
          badge: 'bg-blue-100 text-blue-700',
        }
      : {
          btn: 'bg-orange-500 hover:bg-orange-600',
          light: 'bg-orange-50 text-orange-700 border-orange-200',
          badge: 'bg-orange-100 text-orange-700',
        };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-100">
      <div className="flex items-center gap-4 px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <ModeToggle
          mode={mode}
          onChange={(m) => {
            setMode(m);
            voidBill();
            setSupplierId('');
          }}
        />

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2">
          <StoreIcon size={15} className="text-slate-400" />
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-400 max-w-[220px]"
          >
            {storesLoading && <option value="">Loading stores…</option>}
            {!storesLoading && stores.length === 0 && <option value="">No stores</option>}
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span className={`px-2 py-1 rounded-md font-medium ${accentCls.badge}`}>
            {mode === 'sales' ? 'SALES MODE' : 'PURCHASE MODE'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
              {mode === 'sales' ? 'Add Product' : 'Receive Product'}
            </p>
            <div className="relative">
              <Scan size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBtn()}
                placeholder="SKU or product name..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => setSearchVal('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden shadow-lg bg-white z-10 relative">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 border-b border-slate-50 last:border-0 transition"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Package size={13} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.sku || p.id.slice(0, 8)}</p>
                      <span className="text-[10px] font-semibold text-blue-600">{fmt(productRate(p, mode))}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-2.5 py-2 hover:bg-slate-100 text-slate-500 transition"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-12 text-center text-sm font-semibold border-x border-slate-200 py-2 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="px-2.5 py-2 hover:bg-slate-100 text-slate-500 transition"
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

          {mode === 'sales' && (
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Quick Charges</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_CHARGES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => addQuickCharge(c)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition text-left ${
                      c.amount < 0
                        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {c.label}
                    <span className={`block text-[10px] font-mono ${c.amount < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {c.amount < 0 ? '-' : '+'}${Math.abs(c.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'purchase' && (
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Supplier</p>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400 bg-white"
              >
                <option value="">— Select Supplier —</option>
                {suppliers.map((s: Supplier) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-auto p-4 space-y-2">
            <Link
              to={mode === 'sales' ? '/invoices' : '/bills'}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <Receipt size={14} />
              {mode === 'sales' ? 'Bill History' : 'Bills'}
            </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              {mode === 'sales' ? (
                <ShoppingCart size={16} className="text-blue-600" />
              ) : (
                <PackagePlus size={16} className="text-orange-500" />
              )}
              <span className="font-semibold text-slate-800">
                {mode === 'sales' ? 'Running Bill' : 'Receiving List'}
              </span>
              {lines.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${accentCls.badge}`}>
                  {lines.length} item{lines.length !== 1 ? 's' : ''}
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
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-200 rounded-lg cursor-not-allowed"
                title="Hold not wired yet"
                disabled
              >
                <PauseCircle size={13} /> Hold
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
                {mode === 'sales' ? (
                  <ShoppingCart size={40} strokeWidth={1.2} />
                ) : (
                  <PackagePlus size={40} strokeWidth={1.2} />
                )}
                <p className="text-sm font-medium text-slate-400">
                  {mode === 'sales'
                    ? 'Search or scan a product to start billing'
                    : 'Search a product to add to the receiving list'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    {['#', 'SKU', 'Description', 'Qty', 'Rate', 'Tax', 'Total', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-slate-50/60 group">
                      <td className="px-3 py-3 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-500">{line.sku}</td>
                      <td className="px-3 py-3">
                        <p className="text-slate-800 font-medium text-sm">{line.name}</p>
                        {overrideLine === line.id ? (
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
                              <option value="">Tax as-is ({line.taxPct}%)</option>
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
                            <button type="button" onClick={() => setOverrideLine(null)} className="text-slate-400 hover:text-slate-600">
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
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(line.id, -1)}
                            className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-500"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-8 text-center font-semibold text-slate-800">{line.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(line.id, 1)}
                            className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 text-slate-500"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 pl-0.5">{line.unitLabel}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{fmt(line.rate)}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">
                        {line.taxPct > 0 ? (
                          <span>
                            {line.taxPct}% <span className="text-slate-400">({fmt(lineTax(line))})</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{fmt(lineTotal(line))}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {extraCharges.map((ec) => (
                    <tr key={ec.id} className="bg-slate-50/40">
                      <td />
                      <td />
                      <td className="px-3 py-2 text-xs text-slate-500 italic">{ec.label}</td>
                      <td />
                      <td />
                      <td />
                      <td className={`px-3 py-2 text-sm font-semibold ${ec.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {ec.amount < 0 ? '-' : '+'}
                        {fmt(Math.abs(ec.amount))}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeCharge(ec.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition"
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
                <AlertCircle size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-semibold text-amber-800">Checkout did not complete — cart kept. Fix the failed steps:</p>
              </div>
              <StepList steps={checkoutResult.steps} />
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase">
              {mode === 'sales' ? 'Checkout' : 'Receiving Summary'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Items</span>
                <span className="font-medium text-slate-700">{lines.length}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-medium text-slate-700">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span className="font-medium text-slate-700">{fmt(totalTax)}</span>
              </div>
              {extraCharges.length > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Extra Charges</span>
                  <span className={`font-medium ${extraTotal < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {extraTotal < 0 ? '-' : '+'}
                    {fmt(Math.abs(extraTotal))}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-lg pt-2 border-t border-slate-200">
                <span>Grand Total</span>
                <span className="text-blue-700">{fmt(grandTotal)}</span>
              </div>
            </div>

            {mode === 'sales' && (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['cash', 'card'] as PayMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMethod(m)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                          payMethod === m
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {m === 'cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                  {payMethod === 'cash' && grandTotal > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-slate-500">
                        <label className="block mb-1 font-medium">Cash Tendered</label>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(e.target.value)}
                          placeholder="Enter amount received"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                {mode === 'sales' ? 'Customer (optional)' : 'Supplier Ref. / Notes'}
              </p>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  value={mode === 'sales' ? customerInfo : supplierRef}
                  onChange={(e) =>
                    mode === 'sales' ? setCustomerInfo(e.target.value) : setSupplierRef(e.target.value)
                  }
                  placeholder={mode === 'sales' ? 'Walk-in / phone / email' : 'Supplier invoice / LPO no.'}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                />
              </div>
              {mode === 'sales' && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCustomer((v) => !v)}
                    className="text-[10px] text-slate-500 underline"
                  >
                    {showAdvancedCustomer ? 'Hide' : 'Advanced'}: sync with server customer UUID
                  </button>
                  {showAdvancedCustomer && (
                    <input
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder="Customer UUID (optional — for Order API)"
                      className="mt-1.5 w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 font-mono"
                    />
                  )}
                </div>
              )}
            </div>

            <div className={`rounded-xl p-3 border text-xs ${accentCls.light}`}>
              <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                <StoreIcon size={12} />
                {mode === 'sales' ? 'Stock deducted from' : 'Stock added to'}
              </div>
              <p className="text-slate-600 ml-4">{store?.name ?? 'Select a store'}</p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-slate-200 space-y-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => void generateBill()}
              disabled={lines.length === 0 || checkingOut}
              className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${accentCls.btn}`}
            >
              {mode === 'sales' ? <Receipt size={16} /> : <PackagePlus size={16} />}
              {checkingOut ? 'Processing…' : mode === 'sales' ? 'Generate Bill' : 'Confirm Receipt'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={printReceipt}
                disabled={!lastReceipt && !success}
                title={lastReceipt || success ? 'Print last receipt' : 'Generate a bill first'}
                className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer size={13} /> Print
              </button>
              <button
                type="button"
                disabled
                title="E-receipt not wired"
                className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-400 cursor-not-allowed"
              >
                <Mail size={13} /> E-Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <BillSuccessModal receipt={success.receipt} steps={success.steps} onClose={closeSuccess} />
      )}

      {(success?.receipt || lastReceipt) && (
        <div className="pos-print-root" aria-hidden>
          <ReceiptDocument receipt={success?.receipt ?? lastReceipt!} />
        </div>
      )}
    </div>
  );
}
