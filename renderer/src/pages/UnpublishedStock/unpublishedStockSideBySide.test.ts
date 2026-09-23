import { describe, expect, it } from 'vitest';
import type { InventoryItem, UnpublishedStock } from '../../types';

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

// Logic mirror of the helper used in UnpublishedStockPage
function buildWhiteStockMap(items: InventoryItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(`${item.locationId}:${item.productId}`, Number(item.quantityOnHand || 0));
  }
  return map;
}

function getWhiteStock(map: Map<string, number>, productId: string, locationId: string): number {
  return map.get(`${locationId}:${productId}`) ?? 0;
}

function computeSideBySideTotals(
  stagedItems: UnpublishedStock[],
  whiteStockMap: Map<string, number>,
) {
  return stagedItems.reduce(
    (acc, item) => {
      const blackQty = Number(item.quantityOnHand || 0);
      const whiteQty = getWhiteStock(whiteStockMap, item.productId, item.locationId);
      const avgCost = Number(item.averageCost || 0);
      return {
        blackQuantity: acc.blackQuantity + blackQty,
        whiteQuantity: acc.whiteQuantity + whiteQty,
        totalQuantity: acc.totalQuantity + blackQty + whiteQty,
        value: acc.value + blackQty * avgCost,
      };
    },
    { blackQuantity: 0, whiteQuantity: 0, totalQuantity: 0, value: 0 },
  );
}

function simulatePublishImpact(
  currentBlack: number,
  currentWhite: number,
  publishQty: number,
) {
  const validPub = !Number.isNaN(publishQty) && publishQty > 0 && publishQty <= currentBlack;
  const afterBlack = validPub ? currentBlack - publishQty : currentBlack;
  const afterWhite = validPub ? currentWhite + publishQty : currentWhite;
  const totalBefore = currentBlack + currentWhite;
  const totalAfter = afterBlack + afterWhite;

  return {
    valid: validPub,
    afterBlack,
    afterWhite,
    totalBefore,
    totalAfter,
    conserved: totalBefore === totalAfter,
  };
}

function resolveUserLocationScope(params: {
  hasOrgWideAccess: boolean;
  assignedLocationId?: string;
  selectedFilterId?: string;
}) {
  const isLocked = !params.hasOrgWideAccess;
  const queryLocationId = params.hasOrgWideAccess ? undefined : (params.assignedLocationId || undefined);
  const effectiveFilterId = isLocked ? params.assignedLocationId : (params.selectedFilterId || undefined);

  return {
    isLocked,
    queryLocationId,
    effectiveFilterId,
  };
}

describe('Unpublished Stock Side-by-Side Stock & Location Scoping', () => {
  it('correctly maps white stock by composite key (locationId:productId)', () => {
    const whiteItems = [
      inv({ locationId: 'loc-nairobi', productId: 'p1', quantityOnHand: 50 }),
      inv({ locationId: 'loc-mombasa', productId: 'p1', quantityOnHand: 25 }),
      inv({ locationId: 'loc-nairobi', productId: 'p2', quantityOnHand: 100 }),
    ];
    const map = buildWhiteStockMap(whiteItems);

    expect(getWhiteStock(map, 'p1', 'loc-nairobi')).toBe(50);
    expect(getWhiteStock(map, 'p1', 'loc-mombasa')).toBe(25);
    expect(getWhiteStock(map, 'p2', 'loc-nairobi')).toBe(100);
    // Unmatched returns 0, never undefined or NaN
    expect(getWhiteStock(map, 'p2', 'loc-mombasa')).toBe(0);
    expect(getWhiteStock(map, 'p3', 'loc-nairobi')).toBe(0);
  });

  it('aggregates side-by-side black, white, and total physical stock correctly', () => {
    const staged = [
      unpub({ locationId: 'loc-1', productId: 'p1', quantityOnHand: 30, averageCost: 500 }),
      unpub({ locationId: 'loc-1', productId: 'p2', quantityOnHand: 20, averageCost: 1000 }),
    ];
    const whiteItems = [
      inv({ locationId: 'loc-1', productId: 'p1', quantityOnHand: 70 }),
      inv({ locationId: 'loc-1', productId: 'p2', quantityOnHand: 0 }),
    ];
    const map = buildWhiteStockMap(whiteItems);

    const totals = computeSideBySideTotals(staged, map);

    expect(totals.blackQuantity).toBe(50); // 30 + 20
    expect(totals.whiteQuantity).toBe(70); // 70 + 0
    expect(totals.totalQuantity).toBe(120); // 50 + 70
    expect(totals.value).toBe(35000); // 30*500 + 20*1000
  });

  it('accurately simulates publishing from black to white while conserving physical stock', () => {
    const sim = simulatePublishImpact(50, 100, 20);

    expect(sim.valid).toBe(true);
    expect(sim.afterBlack).toBe(30);
    expect(sim.afterWhite).toBe(120);
    expect(sim.totalBefore).toBe(150);
    expect(sim.totalAfter).toBe(150);
    expect(sim.conserved).toBe(true);
  });

  it('rejects publishing more than available black stock', () => {
    const sim = simulatePublishImpact(15, 50, 20);

    expect(sim.valid).toBe(false);
    expect(sim.afterBlack).toBe(15);
    expect(sim.afterWhite).toBe(50);
  });

  describe('Single-location vs Org-wide scoping', () => {
    it('locks queries and filters to assigned branch for single-location users', () => {
      const scope = resolveUserLocationScope({
        hasOrgWideAccess: false,
        assignedLocationId: 'loc-mombasa',
        selectedFilterId: 'loc-nairobi', // Should be ignored because user is locked
      });

      expect(scope.isLocked).toBe(true);
      expect(scope.queryLocationId).toBe('loc-mombasa');
      expect(scope.effectiveFilterId).toBe('loc-mombasa');
    });

    it('allows org admins to query globally and filter across branches', () => {
      const globalScope = resolveUserLocationScope({
        hasOrgWideAccess: true,
        assignedLocationId: 'loc-headquarters',
        selectedFilterId: undefined, // All locations
      });

      expect(globalScope.isLocked).toBe(false);
      expect(globalScope.queryLocationId).toBeUndefined(); // Backend returns org-wide
      expect(globalScope.effectiveFilterId).toBeUndefined();

      const filteredScope = resolveUserLocationScope({
        hasOrgWideAccess: true,
        assignedLocationId: 'loc-headquarters',
        selectedFilterId: 'loc-kisumu',
      });

      expect(filteredScope.effectiveFilterId).toBe('loc-kisumu');
    });
  });
});
