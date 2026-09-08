import { useMemo, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Branches } from '../api';
import { canViewAllBranches } from '../config/dashboard-permissions';

export function useDashboardScope() {
  const { raw, isOrgAdmin } = useSession();
  const hasOrgWideAccess = raw?.hasOrgWideAccess ?? isOrgAdmin;
  const assignedBranchId = raw?.branchIds?.[0];
  const currencyCode = raw?.currencyCode ?? 'KES';

  const { data: branches } = Branches.useList();
  const canPickLocation = canViewAllBranches(hasOrgWideAccess);

  const [selectedBranchId, setSelectedBranchId] = useState<string | 'all'>('all');

  const effectiveBranchId = useMemo(() => {
    if (!canPickLocation) return assignedBranchId;
    return selectedBranchId === 'all' ? undefined : selectedBranchId;
  }, [canPickLocation, assignedBranchId, selectedBranchId]);

  const branchOptions = useMemo(() => {
    if (!canPickLocation && assignedBranchId) {
      const branch = branches?.find((b) => b.id === assignedBranchId);
      return branch ? [{ id: branch.id, name: branch.name }] : [];
    }
    return branches ?? [];
  }, [canPickLocation, assignedBranchId, branches]);

  return {
    currencyCode,
    hasOrgWideAccess,
    canPickLocation,
    assignedBranchId,
    selectedBranchId,
    setSelectedBranchId,
    effectiveBranchId,
    branchOptions,
  };
}
