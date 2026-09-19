import { describe, expect, it } from 'vitest';
import { MODULES, ALL_ITEMS, pageKeyForPath } from './modules';
describe('Navigation MODULES configuration', () => {
  it('contains creditors-ac and debtors-ac under Accounts group', () => {
    const accountsGroup = MODULES.find((g) => g.label === 'Accounts');
    expect(accountsGroup).toBeDefined();

    const creditorsItem = accountsGroup?.items.find((i) => i.key === 'creditors-ac');
    expect(creditorsItem).toBeDefined();
    expect(creditorsItem?.title).toBe('Creditors A/C');
    expect(creditorsItem?.path).toBe('/sales/debtors');

    const debtorsItem = accountsGroup?.items.find((i) => i.key === 'debtors-ac');
    expect(debtorsItem).toBeDefined();
    expect(debtorsItem?.title).toBe('Debtors A/C');
    expect(debtorsItem?.path).toBe('/purchase/creditors');
  });

  it('contains suppliers under Purchase group with correct title', () => {
    const purchaseGroup = MODULES.find((g) => g.label === 'Purchase');
    expect(purchaseGroup).toBeDefined();

    const suppliersItem = purchaseGroup?.items.find((i) => i.key === 'suppliers');
    expect(suppliersItem).toBeDefined();
    expect(suppliersItem?.title).toBe('Suppliers');
    expect(suppliersItem?.path).toBe('/suppliers');
  });

  it('resolves correct pageKey for paths', () => {
    expect(pageKeyForPath('/sales/debtors')).toBe('creditors-ac');
    expect(pageKeyForPath('/purchase/creditors')).toBe('debtors-ac');
  });

  it('contains pending-approvals uniquely under Sales group and no duplicate Approvals group', () => {
    const salesGroup = MODULES.find((g) => g.label === 'Sales');
    expect(salesGroup).toBeDefined();

    const pendingApprovals = salesGroup?.items.find((i) => i.key === 'pending-approvals');
    expect(pendingApprovals).toBeDefined();
    expect(pendingApprovals?.title).toBe('Pending Approvals');
    expect(pendingApprovals?.path).toBe('/pending-approvals');

    const approvalsGroup = MODULES.find((g) => g.label === 'Approvals');
    expect(approvalsGroup).toBeUndefined();
    expect(pageKeyForPath('/pending-approvals')).toBe('pending-approvals');
  });

  it('ensures all module item keys are unique', () => {
    const keys = ALL_ITEMS.map((item) => item.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });
});
