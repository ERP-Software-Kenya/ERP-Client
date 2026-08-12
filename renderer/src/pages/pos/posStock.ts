import type { InventoryItem, SaleType } from "../../types";
import type { BillLine } from "./posHelpers";

export interface StockInfo {
  available: number;
  onHand: number;
  reserved: number;
  unpublished: number;
  reorderLevel: number;
  /** Row exists in inventory for this location + product */
  found: boolean;
}

export function buildLocationStockMap(
  inventory: InventoryItem[],
  locationId: string,
): Map<string, InventoryItem> {
  const map = new Map<string, InventoryItem>();
  if (!locationId) return map;
  for (const row of inventory) {
    if (row.locationId === locationId) {
      map.set(row.productId, row);
    }
  }
  return map;
}

/** Sellable qty for the active sale type at the selected location. */
export function stockAvailable(item: InventoryItem | undefined, saleType: SaleType): number {
  if (!item) return 0;
  if (saleType === "black") {
    return Math.max(0, Number(item.quantityUnpublished ?? 0));
  }
  const onHand = Number(item.quantityOnHand ?? 0);
  const reserved = Number(item.quantityReserved ?? 0);
  return Math.max(0, onHand - reserved);
}

export function getStockInfo(
  stockMap: Map<string, InventoryItem>,
  productId: string,
  saleType: SaleType,
): StockInfo {
  const item = stockMap.get(productId);
  if (!item) {
    return {
      available: 0,
      onHand: 0,
      reserved: 0,
      unpublished: 0,
      reorderLevel: 0,
      found: false,
    };
  }
  return {
    available: stockAvailable(item, saleType),
    onHand: Number(item.quantityOnHand ?? 0),
    reserved: Number(item.quantityReserved ?? 0),
    unpublished: Number(item.quantityUnpublished ?? 0),
    reorderLevel: Number(item.reorderLevel ?? 0),
    found: true,
  };
}

export function cartQtyForProduct(
  lines: BillLine[],
  productId: string,
  excludeLineId?: number,
): number {
  return lines
    .filter((l) => l.productId === productId && l.id !== excludeLineId)
    .reduce((sum, l) => sum + l.qty, 0);
}

export type StockBadgeTone = "ok" | "low" | "out" | "none";

export function stockBadgeTone(info: StockInfo): StockBadgeTone {
  if (!info.found || info.available <= 0) return "out";
  if (info.reorderLevel > 0 && info.available <= info.reorderLevel) return "low";
  return "ok";
}

export function stockBadgeLabel(info: StockInfo, saleType: SaleType): string {
  if (!info.found) return "No stock record";
  if (info.available <= 0) {
    return saleType === "black" ? "No black stock" : "Out of stock";
  }
  const unit = info.available === 1 ? "unit" : "units";
  if (saleType === "black") {
    return `${info.available} black ${unit}`;
  }
  return `${info.available} left`;
}

export function lineExceedsStock(
  lines: BillLine[],
  line: BillLine,
  stockMap: Map<string, InventoryItem>,
  saleType: SaleType,
): boolean {
  const info = getStockInfo(stockMap, line.productId, saleType);
  if (!info.found) return true;
  const totalForProduct = cartQtyForProduct(lines, line.productId);
  return totalForProduct > info.available;
}

export function saleHasStockIssues(
  lines: BillLine[],
  stockMap: Map<string, InventoryItem>,
  saleType: SaleType,
): boolean {
  return lines.some((line) => lineExceedsStock(lines, line, stockMap, saleType));
}
