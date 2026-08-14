import type { RefObject } from "react";
import { ChevronDown, Package, Receipt, Scan, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product, SaleType, Supplier } from "../../../types";
import { StockBadge } from "./StockBadge";
import type { StockInfo } from "../posStock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { formatEntityLabel } from "../../../lib/entityLabel";
import { fmt, productRate, type Mode } from "../posHelpers";

export interface QuickChargeTile {
  label: string;
  amount: number;
}

export interface ProductSearchPanelProps {
  mode: Mode;
  saleType: SaleType;
  getStockInfo: (productId: string) => StockInfo;
  searchRef: RefObject<HTMLInputElement | null>;
  searchVal: string;
  onSearchChange: (v: string) => void;
  onEnter: () => void;
  suggestions: Product[];
  onAddProduct: (p: Product) => void;
  onAddBtn: () => void;
  onAddQuickCharge: (c: QuickChargeTile) => void;
  quickCharges: QuickChargeTile[];
  supplierId: string;
  onSupplierChange: (id: string) => void;
  suppliers: Supplier[];
  accentBtnCls: string;
}

export function ProductSearchPanel({
  mode,
  saleType,
  getStockInfo,
  searchRef,
  searchVal,
  onSearchChange,
  onEnter,
  suggestions,
  onAddProduct,
  onAddBtn,
  onAddQuickCharge,
  quickCharges,
  supplierId,
  onSupplierChange,
  suppliers,
  accentBtnCls,
}: ProductSearchPanelProps) {
  return (
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
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onEnter()}
            placeholder="SKU or product name..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="mt-1 border border-border rounded-lg overflow-hidden shadow-lg bg-card z-10 relative">
            {suggestions.map((p) => {
              const stock =
                mode === "sales" || mode === "purchase"
                  ? getStockInfo(p.id)
                  : null;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAddProduct(p)}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-primary/10 border-b border-border last:border-0 transition"
                >
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package size={13} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatEntityLabel({ sku: p.sku, id: p.id })}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-primary">
                        {fmt(productRate(p, mode))}
                      </span>
                      {stock && (
                        <StockBadge
                          info={stock}
                          saleType={mode === "sales" ? saleType : "normal"}
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {mode === "sales" && suggestions.length > 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
            {saleType === "black"
              ? "Badge shows black pool qty at this location."
              : "Badge shows sellable qty (on hand minus reserved)."}
          </p>
        )}

        <button
          type="button"
          onClick={onAddBtn}
          className={`mt-3 w-full py-2 rounded-lg text-white text-sm font-semibold transition ${accentBtnCls}`}
        >
          Add
        </button>
      </div>

      {mode === "sales" && quickCharges.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Quick Charges
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {quickCharges.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => onAddQuickCharge(c)}
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
              <DropdownMenuRadioGroup value={supplierId} onValueChange={onSupplierChange}>
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
  );
}
