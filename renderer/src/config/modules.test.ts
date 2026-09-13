import { describe, expect, it } from 'vitest';
import { MODULES, ALL_ITEMS, pageKeyForPath } from './modules';

describe('Navigation MODULES configuration', () => {
  it('contains debtors under Sales group', () => {
    const salesGroup = MODULES.find((g) => g.label === 'Sales');
    expect(salesGroup).toBeDefined();

    const debtorsItem = salesGroup?.items.find((i) => i.key === 'debtors');
    expect(debtorsItem).toBeDefined();
    expect(debtorsItem?.title).toBe('Debtors');
    expect(debtorsItem?.path).toBe('/sales/debtors');
  });

  it('contains purchase-creditors under Purchase group', () => {
    const purchaseGroup = MODULES.find((g) => g.label === 'Purchase');
    expect(purchaseGroup).toBeDefined();

    const creditorsItem = purchaseGroup?.items.find((i) => i.key === 'purchase-creditors');
    expect(creditorsItem).toBeDefined();
    expect(creditorsItem?.title).toBe('Creditors');
    expect(creditorsItem?.path).toBe('/purchase/creditors');
  });

  it('resolves correct pageKey for new paths', () => {
    expect(pageKeyForPath('/sales/debtors')).toBe('debtors');
    expect(pageKeyForPath('/purchase/creditors')).toBe('purchase-creditors');
  });

  it('ensures all module item keys are unique', () => {
    const keys = ALL_ITEMS.map((item) => item.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });
});
