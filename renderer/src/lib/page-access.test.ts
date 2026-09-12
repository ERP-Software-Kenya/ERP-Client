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
});

describe('isFullPageAccessRole', () => {
  it('treats org_admin as a full-access role', () => {
    expect(isFullPageAccessRole('org_admin')).toBe(true);
  });

  it('does not treat branch_manager as a full-access role', () => {
    expect(isFullPageAccessRole('branch_manager')).toBe(false);
  });
});
