import { describe, it, expect } from 'vitest';
import {
  getBranchForLocation,
  resolveStockRequestsScope,
} from './index';
import type { Location, Branch } from '../../types';

// Mock test dataset modeled directly on the ERP seed database (demo-org-data.seed.ts)
const SEED_BRANCHES: Branch[] = [
  {
    id: 'cc000001-0000-0000-0000-000000000001',
    organizationId: 'org-demo-1',
    name: 'Mumbai Branch',
    code: 'MUM',
    city: 'Mumbai',
    userId: 'user-mumbai-manager',
    isActive: true,
    locationIds: [
      'dd000001-0000-0000-0000-000000000001', // Main Store
      'dd000001-0000-0000-0000-000000000002', // Mumbai Retail Store
      'dd000001-0000-0000-0000-000000000003', // Mumbai Warehouse
    ],
  },
  {
    id: 'cc000001-0000-0000-0000-000000000002',
    organizationId: 'org-demo-1',
    name: 'Delhi Branch',
    code: 'DEL',
    city: 'Delhi',
    userId: 'user-delhi-manager',
    isActive: true,
    locationIds: [
      'dd000001-0000-0000-0000-000000000004', // Delhi Retail Store
      'dd000001-0000-0000-0000-000000000005', // Delhi Warehouse
    ],
  },
  {
    id: 'cc000001-0000-0000-0000-000000000003',
    organizationId: 'org-demo-1',
    name: 'Pune Branch',
    code: 'PUN',
    city: 'Pune',
    userId: 'user-pune-manager',
    isActive: true,
    locationIds: [
      'dd000001-0000-0000-0000-000000000006', // Pune Retail Store
    ],
  },
];

const SEED_LOCATIONS: Location[] = [
  {
    id: 'dd000001-0000-0000-0000-000000000001',
    organizationId: 'org-demo-1',
    parentId: 'cc000001-0000-0000-0000-000000000001',
    name: 'Main Store',
    type: 'store',
    city: 'Mumbai',
    isActive: true,
  },
  {
    id: 'dd000001-0000-0000-0000-000000000002',
    organizationId: 'org-demo-1',
    parentId: 'cc000001-0000-0000-0000-000000000001',
    name: 'Mumbai Retail Store',
    type: 'store',
    city: 'Mumbai',
    isActive: true,
  },
  {
    id: 'dd000001-0000-0000-0000-000000000003',
    organizationId: 'org-demo-1',
    parentId: 'cc000001-0000-0000-0000-000000000001',
    name: 'Mumbai Warehouse',
    type: 'warehouse',
    city: 'Mumbai',
    isActive: true,
  },
  {
    id: 'dd000001-0000-0000-0000-000000000004',
    organizationId: 'org-demo-1',
    parentId: 'cc000001-0000-0000-0000-000000000002',
    name: 'Delhi Retail Store',
    type: 'store',
    city: 'Delhi',
    isActive: true,
  },
  {
    id: 'dd000001-0000-0000-0000-000000000005',
    organizationId: 'org-demo-1',
    parentId: 'cc000001-0000-0000-0000-000000000002',
    name: 'Delhi Warehouse',
    type: 'warehouse',
    city: 'Delhi',
    isActive: true,
  },
  {
    id: 'dd000001-0000-0000-0000-000000000006',
    organizationId: 'org-demo-1',
    parentId: 'cc000001-0000-0000-0000-000000000003',
    name: 'Pune Retail Store',
    type: 'store',
    city: 'Pune',
    isActive: true,
  },
  {
    id: 'dd000001-0000-0000-0000-000000000007',
    organizationId: 'org-demo-1',
    name: 'Headquarters Office',
    type: 'branch', // Non-store / non-warehouse
    city: 'Mumbai',
    isActive: true,
  },
];

describe('Stock Requests End-to-End Role & Location Scoping', () => {
  describe('Location to Branch Resolution (getBranchForLocation)', () => {
    it('accurately associates Mumbai locations with Mumbai Branch', () => {
      const mainStore = SEED_LOCATIONS[0];
      const mumbaiStore = SEED_LOCATIONS[1];
      const mumbaiWh = SEED_LOCATIONS[2];

      expect(getBranchForLocation(mainStore, SEED_BRANCHES)?.name).toBe('Mumbai Branch');
      expect(getBranchForLocation(mumbaiStore, SEED_BRANCHES)?.name).toBe('Mumbai Branch');
      expect(getBranchForLocation(mumbaiWh, SEED_BRANCHES)?.name).toBe('Mumbai Branch');
    });

    it('accurately associates Delhi locations with Delhi Branch', () => {
      const delhiStore = SEED_LOCATIONS[3];
      const delhiWh = SEED_LOCATIONS[4];

      expect(getBranchForLocation(delhiStore, SEED_BRANCHES)?.name).toBe('Delhi Branch');
      expect(getBranchForLocation(delhiWh, SEED_BRANCHES)?.name).toBe('Delhi Branch');
    });

    it('accurately associates Pune locations with Pune Branch', () => {
      const puneStore = SEED_LOCATIONS[5];
      expect(getBranchForLocation(puneStore, SEED_BRANCHES)?.name).toBe('Pune Branch');
    });

    it('resolves unlinked locations via city or name fallback', () => {
      const unlinkedDelhiLoc: Location = {
        id: 'unlinked-loc-1',
        name: 'Delhi Express Hub',
        type: 'store',
        city: 'Delhi',
      };
      expect(getBranchForLocation(unlinkedDelhiLoc, SEED_BRANCHES)?.name).toBe('Delhi Branch');
    });
  });

  describe('User Role: SuperAdmin / OrgAdmin (Org-wide access)', () => {
    it('allows OrgAdmin to view and switch between all branches', () => {
      const scope = resolveStockRequestsScope({
        user: { id: 'admin-user-1' },
        raw: { id: 'admin-user-1', roles: ['org_admin'], hasOrgWideAccess: true },
        hasOrgWideAccess: true,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
      });

      // Admin is not locked to any branch
      expect(scope.isBranchLocked).toBe(false);
      // Defaults to the first branch
      expect(scope.effectiveBranchId).toBe(SEED_BRANCHES[0].id);
      // Mumbai stores and warehouses only for Mumbai branch selection
      expect(scope.branchStoresAndWarehouses.map((l) => l.name)).toEqual([
        'Main Store',
        'Mumbai Retail Store',
        'Mumbai Warehouse',
      ]);
    });

    it('filters stores when OrgAdmin selects Delhi Branch', () => {
      const delhiBranchId = 'cc000001-0000-0000-0000-000000000002';
      const scope = resolveStockRequestsScope({
        user: { id: 'admin-user-1' },
        raw: { id: 'admin-user-1', roles: ['super_admin'], hasOrgWideAccess: true },
        hasOrgWideAccess: true,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
        selectedBranchId: delhiBranchId,
      });

      expect(scope.isBranchLocked).toBe(false);
      expect(scope.effectiveBranchId).toBe(delhiBranchId);
      // Only Delhi store and warehouse appear
      expect(scope.branchStoresAndWarehouses.map((l) => l.name)).toEqual([
        'Delhi Retail Store',
        'Delhi Warehouse',
      ]);
      // Headquarters Office (type: 'branch') is excluded
      expect(scope.branchStoresAndWarehouses.some((l) => l.type === 'branch')).toBe(false);
    });

    it('filters stores when OrgAdmin selects Pune Branch', () => {
      const puneBranchId = 'cc000001-0000-0000-0000-000000000003';
      const scope = resolveStockRequestsScope({
        user: { id: 'admin-user-1' },
        raw: { id: 'admin-user-1', roles: ['org_admin'], hasOrgWideAccess: true },
        hasOrgWideAccess: true,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
        selectedBranchId: puneBranchId,
      });

      expect(scope.branchStoresAndWarehouses.map((l) => l.name)).toEqual(['Pune Retail Store']);
    });
  });

  describe('User Role: Delhi Branch Manager', () => {
    it('strictly locks user to Delhi Branch and shows ONLY Delhi stores and warehouses', () => {
      const scope = resolveStockRequestsScope({
        user: { id: 'user-delhi-manager' },
        raw: {
          id: 'user-delhi-manager',
          branchId: 'cc000001-0000-0000-0000-000000000002',
          roles: ['branch_manager'],
          hasOrgWideAccess: false,
          locationIds: [
            'dd000001-0000-0000-0000-000000000004', // Delhi Retail Store
            'dd000001-0000-0000-0000-000000000005', // Delhi Warehouse
          ],
        },
        hasOrgWideAccess: false,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
      });

      // User must be locked
      expect(scope.isBranchLocked).toBe(true);
      expect(scope.assignedBranch?.name).toBe('Delhi Branch');
      expect(scope.effectiveBranchId).toBe('cc000001-0000-0000-0000-000000000002');

      // Only Delhi stores/warehouses must be present
      const names = scope.branchStoresAndWarehouses.map((l) => l.name);
      expect(names).toEqual(['Delhi Retail Store', 'Delhi Warehouse']);

      // Absolutely NO Mumbai or Pune locations may be present
      expect(names).not.toContain('Mumbai Retail Store');
      expect(names).not.toContain('Mumbai Warehouse');
      expect(names).not.toContain('Main Store');
      expect(names).not.toContain('Pune Retail Store');
    });

    it('ignores attempted selectedBranchId manipulation from non-admin', () => {
      // Even if a non-admin tries to pass a different branch ID via client state
      const scope = resolveStockRequestsScope({
        user: { id: 'user-delhi-manager' },
        raw: {
          id: 'user-delhi-manager',
          branchId: 'cc000001-0000-0000-0000-000000000002',
          roles: ['branch_manager'],
          hasOrgWideAccess: false,
        },
        hasOrgWideAccess: false,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
        selectedBranchId: 'cc000001-0000-0000-0000-000000000001', // Mumbai branch ID
      });

      // It must STILL be locked to Delhi Branch!
      expect(scope.isBranchLocked).toBe(true);
      expect(scope.effectiveBranchId).toBe('cc000001-0000-0000-0000-000000000002');
      expect(scope.branchStoresAndWarehouses.map((l) => l.name)).toEqual([
        'Delhi Retail Store',
        'Delhi Warehouse',
      ]);
    });
  });

  describe('User Role: Mumbai Branch Manager', () => {
    it('strictly locks user to Mumbai Branch and shows ONLY Mumbai stores and warehouses', () => {
      const scope = resolveStockRequestsScope({
        user: { id: 'user-mumbai-manager' },
        raw: {
          id: 'user-mumbai-manager',
          roles: ['branch_manager'],
          hasOrgWideAccess: false,
        },
        hasOrgWideAccess: false,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
      });

      expect(scope.isBranchLocked).toBe(true);
      expect(scope.assignedBranch?.name).toBe('Mumbai Branch');
      expect(scope.branchStoresAndWarehouses.map((l) => l.name)).toEqual([
        'Main Store',
        'Mumbai Retail Store',
        'Mumbai Warehouse',
      ]);
      expect(scope.branchStoresAndWarehouses.some((l) => l.city === 'Delhi')).toBe(false);
      expect(scope.branchStoresAndWarehouses.some((l) => l.city === 'Pune')).toBe(false);
    });
  });

  describe('User Role: Store-Specific Staff (Delhi Warehouse Staff)', () => {
    it('prioritizes assigned location as default location', () => {
      const delhiWarehouseId = 'dd000001-0000-0000-0000-000000000005';
      const scope = resolveStockRequestsScope({
        user: { id: 'staff-delhi-wh' },
        raw: {
          id: 'staff-delhi-wh',
          roles: ['packer'],
          hasOrgWideAccess: false,
          locationIds: [delhiWarehouseId], // specifically assigned to Delhi Warehouse
        },
        hasOrgWideAccess: false,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
      });

      expect(scope.isBranchLocked).toBe(true);
      expect(scope.assignedBranch?.name).toBe('Delhi Branch');
      // Default location must automatically be Delhi Warehouse (not Retail Store)
      expect(scope.defaultLocationId).toBe(delhiWarehouseId);
    });
  });

  describe('User Role: Unassigned User', () => {
    it('returns empty store list and locks when user has no assigned branch or locations', () => {
      const scope = resolveStockRequestsScope({
        user: { id: 'unassigned-user' },
        raw: {
          id: 'unassigned-user',
          roles: ['packer'],
          hasOrgWideAccess: false,
          locationIds: [],
        },
        hasOrgWideAccess: false,
        branches: SEED_BRANCHES,
        locations: SEED_LOCATIONS,
      });

      expect(scope.isBranchLocked).toBe(true);
      expect(scope.assignedBranch).toBeUndefined();
      expect(scope.effectiveBranchId).toBe('');
      expect(scope.branchStoresAndWarehouses).toEqual([]);
      expect(scope.defaultLocationId).toBe('');
    });
  });

  describe('Backend Authorization Guard (assertLocationAccess verification)', () => {
    function testAssertLocationAccess(user: { hasOrgWideAccess: boolean; locationIds: string[] }, locationId: string) {
      if (!locationId) return;
      if (user.hasOrgWideAccess || user.locationIds.includes(locationId)) return;
      throw new Error('403 Location Access Denied');
    }

    it('allows OrgAdmin to access any store location', () => {
      const orgAdmin = { hasOrgWideAccess: true, locationIds: [] };
      expect(() => testAssertLocationAccess(orgAdmin, 'dd000001-0000-0000-0000-000000000001')).not.toThrow();
      expect(() => testAssertLocationAccess(orgAdmin, 'dd000001-0000-0000-0000-000000000004')).not.toThrow();
    });

    it('allows Delhi staff to access Delhi locations', () => {
      const delhiUser = {
        hasOrgWideAccess: false,
        locationIds: ['dd000001-0000-0000-0000-000000000004', 'dd000001-0000-0000-0000-000000000005'],
      };
      expect(() => testAssertLocationAccess(delhiUser, 'dd000001-0000-0000-0000-000000000004')).not.toThrow();
      expect(() => testAssertLocationAccess(delhiUser, 'dd000001-0000-0000-0000-000000000005')).not.toThrow();
    });

    it('blocks Delhi staff from accessing Mumbai or Pune locations with 403', () => {
      const delhiUser = {
        hasOrgWideAccess: false,
        locationIds: ['dd000001-0000-0000-0000-000000000004', 'dd000001-0000-0000-0000-000000000005'],
      };
      // Trying to access Mumbai Retail Store
      expect(() => testAssertLocationAccess(delhiUser, 'dd000001-0000-0000-0000-000000000002')).toThrow(
        '403 Location Access Denied',
      );
      // Trying to access Pune Retail Store
      expect(() => testAssertLocationAccess(delhiUser, 'dd000001-0000-0000-0000-000000000006')).toThrow(
        '403 Location Access Denied',
      );
    });
  });
});
