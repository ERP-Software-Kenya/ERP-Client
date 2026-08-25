import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPage, isFullPageAccessRole } from './page-access';

describe('canAccessPage', () => {
  const emptyMap = new Map<string, ReadonlySet<string>>();
  const usersOnlyForStoreManager = new Map<string, ReadonlySet<string>>([
    ['users', new Set(['store_manager'])],
  ]);

  it('grants super_admin every page when configs are empty', () => {
    assert.equal(canAccessPage(['super_admin'], 'users', emptyMap), true);
  });

  it('grants org_admin every page when configs are empty', () => {
    assert.equal(canAccessPage(['org_admin'], 'users', emptyMap), true);
  });

  it('grants org_admin a page even when the config omits org_admin', () => {
    assert.equal(canAccessPage(['org_admin'], 'users', usersOnlyForStoreManager), true);
  });

  it('denies org_admin SuperAdmin-only pages like organizations', () => {
    assert.equal(canAccessPage(['org_admin'], 'organizations', emptyMap), false);
  });

  it('grants super_admin SuperAdmin-only pages', () => {
    assert.equal(canAccessPage(['super_admin'], 'organizations', emptyMap), true);
  });

  it('denies store_staff when configs are empty', () => {
    assert.equal(canAccessPage(['store_staff'], 'users', emptyMap), false);
  });

  it('allows store_manager only when the page lists that role', () => {
    assert.equal(canAccessPage(['store_manager'], 'users', usersOnlyForStoreManager), true);
    assert.equal(canAccessPage(['store_manager'], 'dashboard', usersOnlyForStoreManager), false);
  });
});

describe('isFullPageAccessRole', () => {
  it('treats org_admin as a full-access role', () => {
    assert.equal(isFullPageAccessRole('org_admin'), true);
  });

  it('does not treat store_manager as a full-access role', () => {
    assert.equal(isFullPageAccessRole('store_manager'), false);
  });
});
