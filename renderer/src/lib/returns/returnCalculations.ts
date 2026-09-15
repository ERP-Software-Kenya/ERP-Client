import type {
  BillItem,
  InventoryItem,
  PurchaseItem,
  PurchaseReturn,
  PurchaseReturnSourceType,
  SalesReturn,
} from '../../types';

export function toNumber(value: number | string | null | undefined): number {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function finalizedSalesReturnedQuantity(
  billItemId: string,
  returns: SalesReturn[] | undefined,
): number {
  return (returns ?? [])
    .filter((ret) => ret.status === 'finalized')
    .flatMap((ret) => ret.items ?? [])
    .filter((item) => item.billItemId === billItemId)
    .reduce((sum, item) => sum + toNumber(item.quantity), 0);
}

export function salesLineReturnableQuantity(
  item: BillItem,
  returns: SalesReturn[] | undefined,
): number {
  return Math.max(0, toNumber(item.quantity) - finalizedSalesReturnedQuantity(item.id, returns));
}

export function salesReturnLineTotal(item: BillItem, quantity: number): number {
  const originalQty = Math.max(1, toNumber(item.quantity));
  const unitNet = toNumber(item.lineTotal) / originalQty;
  return roundMoney(unitNet * quantity);
}

export function finalizedPurchaseReturnedQuantity(
  purchaseItemId: string,
  returns: PurchaseReturn[] | undefined,
  sourceType?: PurchaseReturnSourceType,
): number {
  return (returns ?? [])
    .filter((ret) => ret.status === 'finalized')
    .flatMap((ret) => ret.items ?? [])
    .filter((item) => item.purchaseItemId === purchaseItemId)
    .filter((item) => !sourceType || item.sourceType === sourceType)
    .reduce((sum, item) => sum + toNumber(item.quantity), 0);
}

export function purchaseReturnableQuantity(
  item: PurchaseItem,
  returns: PurchaseReturn[] | undefined,
): number {
  return Math.max(
    0,
    toNumber(item.quantityReceived) - finalizedPurchaseReturnedQuantity(item.id, returns, 'allocated_stock'),
  );
}

export function purchaseUnallocatedReturnableQuantity(
  item: PurchaseItem,
  _returns: PurchaseReturn[] | undefined,
): number {
  return Math.max(0, toNumber(item.quantityReceived) - toNumber(item.quantityAllocated));
}

export function purchaseAllocatedReturnableQuantity(
  item: PurchaseItem,
  returns: PurchaseReturn[] | undefined,
  inventory?: InventoryItem,
): number {
  const allocatedAfterReturns = Math.max(
    0,
    toNumber(item.quantityAllocated) - finalizedPurchaseReturnedQuantity(item.id, returns, 'allocated_stock'),
  );
  const locationStock = inventory ? Math.max(0, toNumber(inventory.quantityOnHand)) : allocatedAfterReturns;
  return Math.max(0, Math.min(allocatedAfterReturns, locationStock));
}

export function purchaseReturnLineTotal(item: PurchaseItem, quantity: number): number {
  return roundMoney(toNumber(item.unitCost) * quantity);
}
