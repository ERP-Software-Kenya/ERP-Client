import type { Product } from "../../types";

export type Mode = "sales" | "purchase";
export type PrintDoc = "receipt" | "debtor" | "statement" | "delivery";

export interface BillLine {
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

export interface ExtraCharge {
  id: number;
  label: string;
  amount: number;
}

export function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function lineTax(l: BillLine) {
  return (l.qty * l.rate * l.taxPct) / 100;
}

export function lineTotal(l: BillLine) {
  return l.qty * l.rate + lineTax(l);
}

export function productRate(p: Product, mode: Mode): number {
  if (mode === "purchase")
    return Number(p.costPrice ?? p.wholesalePrice ?? p.retailPrice ?? 0);
  return Number(p.retailPrice ?? p.wholesalePrice ?? p.costPrice ?? 0);
}
