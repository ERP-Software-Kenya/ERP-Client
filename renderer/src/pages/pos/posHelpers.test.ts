import { describe, expect, it } from 'vitest';
import type { Product, ProductBranchPrice } from '../../types';
import { branchAwareTierPrices } from './posHelpers';

const product: Product = {
  id: 'product-1',
  retailPrice: 100,
  loyaltyPrice: 90,
  wholesalePrice: 80,
  transferPrice: 70,
  costPrice: 60,
};

const branchPrice: ProductBranchPrice = {
  id: 'branch-price-1',
  branchId: 'branch-1',
  productId: product.id,
  productName: 'Product',
  retailPrice: 120,
  loyaltyPrice: null,
  wholesalePrice: 85,
  transferPrice: null,
  costPrice: 65,
};

describe('branchAwareTierPrices', () => {
  it('uses branch overrides while preserving organization fallbacks', () => {
    expect(branchAwareTierPrices(product, branchPrice)).toEqual({
      p1: 120,
      p2: 90,
      p3: 85,
      p4: 70,
    });
  });

  it('uses organization prices when no branch pricing exists', () => {
    expect(branchAwareTierPrices(product, undefined)).toEqual({
      p1: 100,
      p2: 90,
      p3: 80,
      p4: 70,
    });
  });
});
