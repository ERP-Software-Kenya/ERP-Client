import type { RefObject } from "react";
import { AlertCircle, Minus, Plus, Scan, ShoppingCart, Trash2 } from "lucide-react";
import type { Product, SaleType } from "../../../../types";
import type { CheckoutResult } from "../../checkout";
import { fmt, lineTotal, type BillLine, type ExtraCharge, type PriceTier } from "../../posHelpers";
import type { StockInfo } from "../../posStock";
import { StockBadge } from "../StockBadge";
import { StepList } from "../StepList";

export interface ProductDetailsSectionProps {
  saleType: SaleType;
  searchRef: RefObject<HTMLInputElement | null>;
  searchVal: string;
  onSearchChange: (v: string) => void;
  onEnter: () => void;
  suggestions: Product[];
  onAddProduct: (p: Product) => void;
  getStockInfo: (productId: string) => StockInfo;
  lineOverStock: (line: BillLine) => boolean;
  hasStockIssues: boolean;
  lines: BillLine[];
  extraCharges: ExtraCharge[];
  onQtyChange: (lineId: number, qty: number) => void;
  onRateChange: (lineId: number, rate: number) => void;
  onTierSelect: (lineId: number, tier: PriceTier) => void;
  onRemoveLine: (id: number) => void;
  onRemoveCharge: (id: number) => void;
  storeCode?: string;
  checkoutResult: CheckoutResult | null;
  showCheckoutFailureBanner: boolean;
}

export function ProductDetailsSection({
  saleType,
  searchRef,
  searchVal,
  onSearchChange,
  onEnter,
  suggestions,
  onAddProduct,
  getStockInfo,
  lineOverStock,
  hasStockIssues,
  lines,
  extraCharges,
  onQtyChange,
  onRateChange,
  onTierSelect,
  onRemoveLine,
  onRemoveCharge,
  storeCode,
  checkoutResult,
  showCheckoutFailureBanner,
}: ProductDetailsSectionProps) {
  const tierCols: Array<{ key: PriceTier; label: string }> = [
    { key: "p1", label: "P1" },
    { key: "p2", label: "P2" },
    { key: "p3", label: "P3" },
    { key: "p4", label: "P4" },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Product Details</h2>
          {lines.length > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {lines.length} items
            </span>
          )}
        </div>
        <div className="relative w-64">
          <Scan size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={searchVal}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onEnter()}
            placeholder="Barcode scan or product search…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
          {suggestions.length > 0 && searchVal.trim() && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
              {suggestions.map((p) => {
                const stock = getStockInfo(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onAddProduct(p)}
                    className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                  >
                    <span className="font-medium">{p.name}</span>
                    <StockBadge info={stock} saleType={saleType} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/50">
            <ShoppingCart size={36} strokeWidth={1.2} />
            <p className="text-sm">Search or scan a product to add a line</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted">
              <tr>
                {[
                  "#",
                  "Product Name",
                  "Store",
                  "Unit",
                  "Weight",
                  "Qty Avail",
                  "Qty Need",
                  ...(saleType === "black" ? ["Official", "Charged"] : tierCols.map((t) => t.label)),
                  "Line Total",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line, idx) => {
                const stock = getStockInfo(line.productId);
                const overStock = lineOverStock(line);
                return (
                  <tr
                    key={line.id}
                    className={`hover:bg-muted/40 ${overStock ? "bg-red-50/80 dark:bg-red-950/20" : ""}`}
                  >
                    <td className="px-2 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <p className="font-medium text-foreground">{line.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{line.sku}</p>
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{line.storeCode ?? storeCode ?? "—"}</td>
                    <td className="px-2 py-2 text-xs capitalize">{line.unitLabel}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{line.unitLabel}</td>
                    <td className="px-2 py-2">
                      {stock.found ? (
                        <StockBadge info={stock} saleType={saleType} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onQtyChange(line.id, Math.max(1, line.qty - 1))}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-6 text-center font-semibold">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => onQtyChange(line.id, line.qty + 1)}
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </td>
                    {saleType === "black" ? (
                      <>
                        <td className="px-2 py-2 tabular-nums text-muted-foreground">{fmt(line.officialRate)}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={line.rate}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v >= 0) onRateChange(line.id, v);
                            }}
                            className="w-20 rounded border border-border bg-background px-2 py-1 text-xs tabular-nums outline-none focus:border-primary"
                          />
                        </td>
                      </>
                    ) : (
                      tierCols.map(({ key }) => {
                        const price = line[key] ?? 0;
                        const active = line.activeTier === key;
                        return (
                          <td key={key} className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => onTierSelect(line.id, key)}
                              className={`rounded px-2 py-1 text-xs tabular-nums transition ${
                                active
                                  ? "bg-primary text-primary-foreground font-semibold"
                                  : "border border-border hover:bg-muted"
                              }`}
                            >
                              {fmt(price)}
                            </button>
                          </td>
                        );
                      })
                    )}
                    <td className="px-2 py-2 font-semibold tabular-nums">{fmt(lineTotal(line))}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => onRemoveLine(line.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {extraCharges.map((ec) => (
                <tr key={ec.id} className="bg-muted/30">
                  <td colSpan={saleType === "black" ? 10 : 12} className="px-2 py-2 text-xs italic text-muted-foreground">
                    {ec.label}
                  </td>
                  <td className="px-2 py-2 font-semibold">{fmt(ec.amount)}</td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => onRemoveCharge(ec.id)} className="text-muted-foreground hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasStockIssues && lines.length > 0 && (
        <div className="flex flex-shrink-0 items-start gap-2 border-t border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-2">
          <AlertCircle size={14} className="mt-0.5 text-red-600 dark:text-red-400" />
          <p className="text-xs font-medium text-red-800 dark:text-red-300">Some lines exceed available stock.</p>
        </div>
      )}

      {showCheckoutFailureBanner && checkoutResult && (
        <div className="flex-shrink-0 border-t border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2">
          <StepList steps={checkoutResult.steps} />
        </div>
      )}
    </section>
  );
}
