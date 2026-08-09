export interface Role {
  id: string;
  organizationId?: string;
  name?: string;
  permissions?: Record<string, unknown>;
  description?: string;
  createdAt?: string;
}

export interface UserRole {
  id: string;
  userId?: string;
  roleId?: string;
  locationId?: string;
  createdAt?: string;
}

export interface PlatformUser {
  id: string;
  organizationId?: string;
  locationId?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
}

// ── Clerk User Management ───────────────────────────────────────────────────

export interface ClerkInvitation {
  id: string;
  emailAddress: string;
  status: EInvitationStatus;
  roles?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ClerkUser {
  /** Alias of clerkUserId — added client-side so rows satisfy DataTable's `{ id: string }`. */
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  banned: boolean;
  roles: string[];
  createdAt: number;
  lastSignInAt: number | null;
}

export interface ClerkUserListResponse {
  data: ClerkUser[];
  totalCount: number;
}

export interface ClerkUserRolesResponse {
  clerkUserId: string;
  roles: string[];
}

export interface InviteUserPayload {
  email: string;
  roles?: string[];
  redirectUrl?: string;
}

export interface UpdateRolesPayload {
  roles: string[];
}

export interface AssignOrgPayload {
  organizationId: string;
  role: string;
}

export interface ClerkOrganization {
  organizationId: string;
  name: string;
  slug: string;
}

// ── Fleet / Vehicles (legacy mock shape — used by VehiclesPage mock only) ─────

export interface PageAccessConfig {
  pageKey: string;
  allowedRoles: string[];
}
