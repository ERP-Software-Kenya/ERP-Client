import { describe, expect, it } from 'vitest';
import {
  purchaseAllocatedReturnableQuantity,
  purchaseReturnLineTotal,
  purchaseUnallocatedReturnableQuantity,
  salesLineReturnableQuantity,
  salesReturnLineTotal,
} from './returnCalculations';
import type { BillItem, PurchaseItem, PurchaseReturn, SalesReturn } from '../../types';

describe('return calculations', () => {
  it('caps sales returns by finalized quantities only', () => {
    const item = { id: 'bi-1', quantity: 10, lineTotal: 500 } as BillItem;
    const returns = [
      { status: 'finalized', items: [{ billItemId: 'bi-1', quantity: 3 }] },
      { status: 'draft', items: [{ billItemId: 'bi-1', quantity: 2 }] },
    ] as SalesReturn[];

    expect(salesLineReturnableQuantity(item, returns)).toBe(7);
    expect(salesReturnLineTotal(item, 2)).toBe(100);
  });

  it('separates unallocated and allocated purchase return caps', () => {
    const item = {
      id: 'pi-1',
      quantityReceived: 12,
      quantityAllocated: 7,
      unitCost: 40,
    } as PurchaseItem;
    const returns = [
      { status: 'finalized', items: [{ purchaseItemId: 'pi-1', sourceType: 'unallocated_received', quantity: 2 }] },
      { status: 'finalized', items: [{ purchaseItemId: 'pi-1', sourceType: 'allocated_stock', quantity: 1 }] },
    ] as PurchaseReturn[];

    expect(purchaseUnallocatedReturnableQuantity(item, returns)).toBe(5);
    expect(purchaseAllocatedReturnableQuantity(item, returns, { quantityOnHand: 4 } as never)).toBe(4);
    expect(purchaseReturnLineTotal(item, 3)).toBe(120);
  });

  it('does not double-count finalized unallocated purchase returns after received quantity is reduced', () => {
    const item = {
      id: 'pi-1',
      quantityReceived: 7,
      quantityAllocated: 0,
      unitCost: 40,
    } as PurchaseItem;
    const returns = [
      { status: 'finalized', items: [{ purchaseItemId: 'pi-1', sourceType: 'unallocated_received', quantity: 3 }] },
    ] as PurchaseReturn[];

    expect(purchaseUnallocatedReturnableQuantity(item, returns)).toBe(7);
  });
});
