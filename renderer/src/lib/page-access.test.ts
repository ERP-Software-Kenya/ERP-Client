import { describe, expect, it } from 'vitest';
import { canAccessPage, isFullPageAccessRole } from './page-access';

describe('canAccessPage', () => {
  const emptyMap = new Map<string, ReadonlySet<string>>();
  const usersOnlyForBranchManager = new Map<string, ReadonlySet<string>>([
    ['users', new Set(['branch_manager'])],
  ]);

  it('grants super_admin every page when configs are empty', () => {
    expect(canAccessPage(['super_admin'], 'users', emptyMap)).toBe(true);
  });

  it('grants org_admin every page when configs are empty', () => {
    expect(canAccessPage(['org_admin'], 'users', emptyMap)).toBe(true);
  });

  it('grants org_admin a page even when the config omits org_admin', () => {
    expect(canAccessPage(['org_admin'], 'users', usersOnlyForBranchManager)).toBe(true);
  });

  it('denies org_admin SuperAdmin-only pages like organizations', () => {
    expect(canAccessPage(['org_admin'], 'organizations', emptyMap)).toBe(false);
  });

  it('grants super_admin SuperAdmin-only pages', () => {
    expect(canAccessPage(['super_admin'], 'organizations', emptyMap)).toBe(true);
  });

  it('denies driver when configs are empty', () => {
    expect(canAccessPage(['driver'], 'users', emptyMap)).toBe(false);
  });

  it('allows branch_manager only when the page lists that role', () => {
    expect(canAccessPage(['branch_manager'], 'users', usersOnlyForBranchManager)).toBe(true);
    expect(canAccessPage(['branch_manager'], 'dashboard', usersOnlyForBranchManager)).toBe(false);
  });

  it('inherits debtors and debtors-ac access from customers when unconfigured', () => {
    const configWithCustomers = new Map<string, ReadonlySet<string>>([
      ['customers', new Set(['branch_manager'])],
    ]);
    expect(canAccessPage(['branch_manager'], 'debtors', configWithCustomers)).toBe(true);
    expect(canAccessPage(['driver'], 'debtors', configWithCustomers)).toBe(false);
    expect(canAccessPage(['branch_manager'], 'debtors-ac', configWithCustomers)).toBe(true);
    expect(canAccessPage(['driver'], 'debtors-ac', configWithCustomers)).toBe(false);
  });

  it('inherits purchase-creditors and creditors-ac access from suppliers when unconfigured', () => {
    const configWithSuppliers = new Map<string, ReadonlySet<string>>([
      ['suppliers', new Set(['branch_manager'])],
    ]);
    expect(canAccessPage(['branch_manager'], 'purchase-creditors', configWithSuppliers)).toBe(true);
    expect(canAccessPage(['driver'], 'purchase-creditors', configWithSuppliers)).toBe(false);
    expect(canAccessPage(['branch_manager'], 'creditors-ac', configWithSuppliers)).toBe(true);
    expect(canAccessPage(['driver'], 'creditors-ac', configWithSuppliers)).toBe(false);
  });

  it('uses explicit debtors config over customers fallback when present', () => {
    const customConfig = new Map<string, ReadonlySet<string>>([
      ['customers', new Set(['branch_manager'])],
      ['debtors', new Set(['driver'])],
    ]);
    expect(canAccessPage(['driver'], 'debtors', customConfig)).toBe(true);
    expect(canAccessPage(['branch_manager'], 'debtors', customConfig)).toBe(false);
  });
});

describe('isFullPageAccessRole', () => {
  it('treats org_admin as a full-access role', () => {
    expect(isFullPageAccessRole('org_admin')).toBe(true);
  });

  it('does not treat branch_manager as a full-access role', () => {
    expect(isFullPageAccessRole('branch_manager')).toBe(false);
  });
});
