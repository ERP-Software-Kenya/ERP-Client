/** Roles that skip page-access config checks. Super admin is platform-wide; org admin is org-wide. */
export const FULL_PAGE_ACCESS_ROLES: readonly string[] = ['super_admin', 'org_admin'];

export function isFullPageAccessRole(role: string): boolean {
  return FULL_PAGE_ACCESS_ROLES.includes(role);
}

export function canAccessPage(
  roles: readonly string[] | undefined,
  pageKey: string,
  accessMap: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  const userRoles = roles ?? [];
  if (userRoles.some((role) => isFullPageAccessRole(role))) {
    return true;
  }
  const allowed = accessMap.get(pageKey);
  if (!allowed) {
    return false;
  }
  return userRoles.some((role) => allowed.has(role));
}
