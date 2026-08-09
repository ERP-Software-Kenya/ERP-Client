export { configureApi, get, post, put, patch, del } from '../../../lib/http';
import { get, post, put, patch, del, uploadForm } from '../../../lib/http';
import { createResource, createCreateOnlyResource } from '../../../lib/resource';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Organization, Category, Product, Supplier, PurchaseOrder, Bill, PaymentTransaction,
  Notification, ItemReturn, ReportGenerationLog, Order, Invoice, Customer, Expense, PurchaseItem,
  ActivityLog, Role, UserRole, PlatformConfiguration, PlatformUser, Location,
  ProductImage, ProductImageUploadUrl, ProductSupplier,
  InventoryItem, StockMovement, StockMovementOp, StockOperationBody, StockTransfer,
  UnpublishedStock, UnpublishedStockMovement, ProductLog, PaginatedResponse,
  BillStatus, PaymentMethod, CreateBillItemInput, UpdateBillInput,
  Country, State, City,
  CreatePurchaseOrderInput, ReceivePurchaseOrderInput,
  ClerkUserListResponse, ClerkUserRolesResponse, ClerkInvitation, EInvitationStatus,
  InviteUserPayload, UpdateRolesPayload, AssignOrgPayload, ClerkOrganization,
  PageAccessConfig,
  FleetVehicle, FleetDriver, FleetTrip, FleetMaintenance, FleetExpense,
  VehicleTypeRef, VehicleBrandRef, FuelTypeRef, MaintenanceTypeRef,
  SalesSummaryData, RevenueTrendPoint, TopProduct, TopCustomer,
  PurchaseSummaryData, PurchaseTrendPoint, TopSupplier,
  InventorySummaryData, StockByLocationPoint,
} from '../../../types';


export const Roles = createCreateOnlyResource<Role>('/api/v1/roles', 'roles', 'Role');

/** Flat list of all roles — backed by the fixed 4-row role table (GET /api/v1/roles/list). */

export function useListRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles', 'list'],
    queryFn: () => get<Role[]>('/api/v1/roles/list'),
    staleTime: 5 * 60 * 1000,
  });
}

export const UserRoles = createCreateOnlyResource<UserRole>('/api/v1/user-roles', 'user-roles', 'User role');

export function useListUserRoles() {
  return useQuery<UserRole[]>({
    queryKey: ['user-roles', 'list'],
    queryFn: () => get<UserRole[]>('/api/v1/user-roles/list'),
    staleTime: 30_000,
  });
}

export function useListUserDirectory(organizationId?: string) {
  return useQuery<PlatformUser[]>({
    queryKey: ['users', 'directory', organizationId],
    queryFn: () => get<PlatformUser[]>('/api/v1/users/directory', organizationId ? { organizationId } : undefined),
    staleTime: 5 * 60 * 1000,
  });
}

export const ClerkUsers = {
  /** GET /api/v1/users?limit=&offset=&organizationId= */
  useList(params: { page: number; limit?: number; organizationId?: string; enabled?: boolean }) {
    const limit = params.limit ?? 15;
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'list', params.page, limit, params.organizationId],
      queryFn: () =>
        get<ClerkUserListResponse>('/api/v1/users', {
          limit,
          offset: (params.page - 1) * limit,
          ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        }).then(withId),
      enabled: params.enabled !== false,
      staleTime: 30_000,
    });
  },

  /** GET /api/v1/users/search?query=&limit=&offset= */
  useSearch(params: { query: string; page: number; limit?: number; enabled?: boolean }) {
    const limit = params.limit ?? 15;
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'search', params.query, params.page, limit],
      queryFn: () =>
        get<ClerkUserListResponse>('/api/v1/users/search', {
          query: params.query,
          limit,
          offset: (params.page - 1) * limit,
        }).then(withId),
      enabled: params.enabled !== false && params.query.trim().length > 0,
      staleTime: 15_000,
    });
  },

  /** GET /api/v1/users/clerk/:clerkUserId/roles */
  useGetRoles(clerkUserId: string | undefined) {
    return useQuery({
      queryKey: [CLERK_USERS_KEY, 'roles', clerkUserId],
      queryFn: () => get<ClerkUserRolesResponse>(`/api/v1/users/clerk/${clerkUserId as string}/roles`),
      enabled: !!clerkUserId,
      staleTime: 30_000,
    });
  },

  /** POST /api/v1/users/clerk/invite */
  useInvite() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: InviteUserPayload) => post<void>('/api/v1/users/clerk/invite', body),
      onSuccess: () => {
        toast.success('Invitation sent');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
        queryClient.invalidateQueries({ queryKey: [CLERK_INVITATIONS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to send invitation'),
    });
  },

  /** GET /api/v1/users/clerk/invitations?status= */
  useListInvitations(status?: EInvitationStatus) {
    return useQuery({
      queryKey: [CLERK_INVITATIONS_KEY, status ?? 'all'],
      queryFn: () =>
        get<ClerkInvitation[]>('/api/v1/users/clerk/invitations', status ? { status } : {}),
      staleTime: 30_000,
    });
  },

  /** DELETE /api/v1/users/clerk/invitations/:invitationId */
  useRevokeInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (invitationId: string) => del<void>(`/api/v1/users/clerk/invitations/${invitationId}`),
      onSuccess: () => {
        toast.success('Invitation revoked');
        queryClient.invalidateQueries({ queryKey: [CLERK_INVITATIONS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to revoke invitation'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/roles */
  useUpdateRoles() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ clerkUserId, body }: { clerkUserId: string; body: UpdateRolesPayload }) =>
        put<void>(`/api/v1/users/clerk/${clerkUserId}/roles`, body),
      onSuccess: () => {
        toast.success('Roles updated');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to update roles'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/ban */
  useBan() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) => put<void>(`/api/v1/users/clerk/${clerkUserId}/ban`, {}),
      onSuccess: () => {
        toast.success('User banned');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to ban user'),
    });
  },

  /** PUT /api/v1/users/clerk/:clerkUserId/unban */
  useUnban() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) => put<void>(`/api/v1/users/clerk/${clerkUserId}/unban`, {}),
      onSuccess: () => {
        toast.success('User unbanned');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to unban user'),
    });
  },

  /** DELETE /api/v1/users/clerk/:clerkUserId */
  useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (clerkUserId: string) => del(`/api/v1/users/clerk/${clerkUserId}`),
      onSuccess: () => {
        toast.success('User deleted');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to delete user'),
    });
  },

  /** POST /api/v1/users/clerk/:clerkUserId/organizations */
  useAssignOrg() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ clerkUserId, body }: { clerkUserId: string; body: AssignOrgPayload }) =>
        post<void>(`/api/v1/users/clerk/${clerkUserId}/organizations`, body),
      onSuccess: () => {
        toast.success('User assigned to organisation');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to assign to organisation'),
    });
  },

  /** DELETE /api/v1/users/clerk/:clerkUserId/organizations/:organizationId */
  useRemoveFromOrg() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ clerkUserId, organizationId }: { clerkUserId: string; organizationId: string }) =>
        del(`/api/v1/users/clerk/${clerkUserId}/organizations/${organizationId}`),
      onSuccess: () => {
        toast.success('User removed from organisation');
        queryClient.invalidateQueries({ queryKey: [CLERK_USERS_KEY] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to remove from organisation'),
    });
  },

  /** GET /api/v1/users/clerk/organizations */
  useListOrganizations() {
    return useQuery<ClerkOrganization[]>({
      queryKey: [CLERK_USERS_KEY, 'organizations'],
      queryFn: () => get<ClerkOrganization[]>('/api/v1/users/clerk/organizations'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

// ── Fleet Reference Data ──────────────────────────────────────────────────────

export const PageAccess = {
  useList(opts?: { enabled?: boolean }) {
    return useQuery<PageAccessConfig[]>({
      queryKey: [PAGE_ACCESS_KEY],
      queryFn: () => get<PageAccessConfig[]>('/api/v1/common-utility/page-access'),
      staleTime: 5 * 60 * 1000,
      enabled: opts?.enabled !== false,
    });
  },

  useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (configs: PageAccessConfig[]) =>
        put<void>('/api/v1/common-utility/page-access', { configs }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: [PAGE_ACCESS_KEY] });
        toast.success('Page access configuration saved');
      },
      onError: () => toast.error('Failed to save page access configuration'),
    });
  },
};
