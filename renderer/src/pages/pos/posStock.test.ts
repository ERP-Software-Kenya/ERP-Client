import { describe, expect, it } from 'vitest';
import type { InventoryItem, UnpublishedStock } from '../../types';
import {
  buildLocationStockMap,
  getStockInfo,
  isSellableNow,
  mergeUnpublishedStock,
  stockAvailable,
} from './posStock';

function inv(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'inv-1',
    organizationId: 'org-1',
    locationId: 'loc-1',
    productId: 'prod-1',
    quantityOnHand: 0,
    quantityReserved: 0,
    reorderLevel: 0,
    ...overrides,
  };
}

function unpub(overrides: Partial<UnpublishedStock>): UnpublishedStock {
  return {
    id: 'unp-1',
    organizationId: 'org-1',
    locationId: 'loc-1',
    productId: 'prod-1',
    quantityOnHand: 0,
    ...overrides,
  };
}

describe('mergeUnpublishedStock', () => {
  it('overlays the real unpublished-stock quantity onto the matching inventory row', () => {
    // Regression: Inventory.useList()'s quantityUnpublished column is never written by
    // the add-black-stock flow (it writes to the separate unpublished_stock table), so
    // it was always 0 and POS always reported "No black stock" no matter how much was added.
    const inventory = [inv({ quantityUnpublished: 0 })];
    const unpublished = [unpub({ quantityOnHand: 12 })];

    const merged = mergeUnpublishedStock(inventory, unpublished);

    expect(merged).toHaveLength(1);
    expect(merged[0].quantityUnpublished).toBe(12);
    expect(stockAvailable(merged[0], 'black')).toBe(12);
  });

  it('leaves inventory rows with no matching unpublished-stock record untouched', () => {
    const inventory = [inv({ quantityUnpublished: 0 })];

    const merged = mergeUnpublishedStock(inventory, []);

    expect(merged[0].quantityUnpublished).toBe(0);
  });

  it('synthesizes a row for black stock added where no white-inventory row exists yet', () => {
    const merged = mergeUnpublishedStock([], [unpub({ quantityOnHand: 5 })]);

    expect(merged).toHaveLength(1);
    const info = getStockInfo(new Map(merged.map((m) => [m.productId, m])), 'prod-1', 'black');
    expect(info.found).toBe(true);
    expect(info.available).toBe(5);
  });

  it('does not cross-contaminate different locations for the same product', () => {
    const inventory = [inv({ locationId: 'loc-1' }), inv({ id: 'inv-2', locationId: 'loc-2' })];
    const unpublished = [unpub({ locationId: 'loc-2', quantityOnHand: 7 })];

    const merged = mergeUnpublishedStock(inventory, unpublished);

    const loc1 = merged.find((m) => m.locationId === 'loc-1')!;
    const loc2 = merged.find((m) => m.locationId === 'loc-2')!;
    expect(loc1.quantityUnpublished).toBeUndefined();
    expect(loc2.quantityUnpublished).toBe(7);
  });
});

// End-to-end scenarios: real inventory + real unpublished-stock rows run through the
// same pipeline POSTerminal uses (merge -> per-location map -> sellability check), using
// product/location shapes modeled on the actual seeded catalog (e.g. SKU PLY6 "6 Ply").
describe('isSellableNow — black-sale product-search visibility, realistic workflows', () => {
  const STORE_A = 'store-a';
  const STORE_B = 'store-b';
  const PLY6 = 'prod-ply6';
  const WRENCH = 'prod-wrench-10';

  it('a product with only white stock (no black added yet) is invisible to a black sale', () => {
    // Cashier switches to Black sale at Store A. "6 Ply" has 50 normal units on hand,
    // nobody has ever added it to the black pool.
    const inventory = [inv({ productId: PLY6, locationId: STORE_A, quantityOnHand: 50 })];
    const map = buildLocationStockMap(mergeUnpublishedStock(inventory, []), STORE_A);

    expect(isSellableNow(map, PLY6, 'black')).toBe(false);
    expect(isSellableNow(map, PLY6, 'normal')).toBe(true);
  });

  it('after an admin adds black stock, the same product becomes visible for black sale only', () => {
    // Real workflow: admin runs "Add Unpublished Stock" for 12 units of 6 Ply at Store A.
    const inventory = [inv({ productId: PLY6, locationId: STORE_A, quantityOnHand: 50 })];
    const unpublished = [unpub({ productId: PLY6, locationId: STORE_A, quantityOnHand: 12 })];
    const map = buildLocationStockMap(mergeUnpublishedStock(inventory, unpublished), STORE_A);

    expect(isSellableNow(map, PLY6, 'black')).toBe(true);
    expect(getStockInfo(map, PLY6, 'black').available).toBe(12);
    // White pool is untouched by the black addition.
    expect(getStockInfo(map, PLY6, 'normal').available).toBe(50);
  });

  it('black stock at another branch does not leak into the current branch\'s search', () => {
    // 8 black units exist for the Wrench at Store B, but the cashier is working Store A.
    const inventory = [
      inv({ productId: WRENCH, locationId: STORE_A, quantityOnHand: 20 }),
      inv({ id: 'inv-2', productId: WRENCH, locationId: STORE_B, quantityOnHand: 5 }),
    ];
    const unpublished = [unpub({ productId: WRENCH, locationId: STORE_B, quantityOnHand: 8 })];
    const merged = mergeUnpublishedStock(inventory, unpublished);

    const mapA = buildLocationStockMap(merged, STORE_A);
    const mapB = buildLocationStockMap(merged, STORE_B);

    expect(isSellableNow(mapA, WRENCH, 'black')).toBe(false); // Store A has no black stock
    expect(isSellableNow(mapB, WRENCH, 'black')).toBe(true); // Store B does
  });

  it('publishing black stock to live inventory removes it from the black-sale list', () => {
    // Real workflow: admin runs "Publish" on the 12-unit black pool — the command moves
    // the quantity into live inventory and zeroes the unpublished_stock record.
    const beforePublish = mergeUnpublishedStock(
      [inv({ productId: PLY6, locationId: STORE_A, quantityOnHand: 50 })],
      [unpub({ productId: PLY6, locationId: STORE_A, quantityOnHand: 12 })],
    );
    expect(isSellableNow(buildLocationStockMap(beforePublish, STORE_A), PLY6, 'black')).toBe(true);

    // Post-publish state: unpublished record drained to 0, live on-hand increased by 12.
    const afterPublish = mergeUnpublishedStock(
      [inv({ productId: PLY6, locationId: STORE_A, quantityOnHand: 62 })],
      [unpub({ productId: PLY6, locationId: STORE_A, quantityOnHand: 0 })],
    );
    const mapAfter = buildLocationStockMap(afterPublish, STORE_A);

    expect(isSellableNow(mapAfter, PLY6, 'black')).toBe(false);
    expect(isSellableNow(mapAfter, PLY6, 'normal')).toBe(true);
    expect(getStockInfo(mapAfter, PLY6, 'normal').available).toBe(62);
  });

  it('a product that ONLY has black stock (no live inventory row) is visible for black sale, invisible for normal', () => {
    // Real workflow: black stock added for a brand-new product before any normal
    // inventory row has ever been created for it at this location.
    const merged = mergeUnpublishedStock([], [unpub({ productId: WRENCH, locationId: STORE_A, quantityOnHand: 10 })]);
    const map = buildLocationStockMap(merged, STORE_A);

    expect(isSellableNow(map, WRENCH, 'black')).toBe(true);
    expect(isSellableNow(map, WRENCH, 'normal')).toBe(false);
  });

  it('fully reserved normal stock is invisible for a normal sale even though on-hand > 0', () => {
    // Real workflow: 10 units on hand, but all 10 are reserved by other draft/held bills.
    const inventory = [inv({ productId: PLY6, locationId: STORE_A, quantityOnHand: 10, quantityReserved: 10 })];
    const map = buildLocationStockMap(mergeUnpublishedStock(inventory, []), STORE_A);

    expect(isSellableNow(map, PLY6, 'normal')).toBe(false);
  });
});
