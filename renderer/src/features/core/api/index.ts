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


export const Organizations = createResource<Organization>('/api/v1/organizations', 'organizations', 'Organization');

export const Categories = createResource<Category>('/api/v1/categories', 'categories', 'Category');

export const PaymentTransactions = createResource<PaymentTransaction>('/api/v1/payment-transactions', 'payment-transactions', 'Payment');

const notificationsBase = createResource<Notification>('/api/v1/notifications', 'notifications', 'Notification');

export const Notifications = {
  ...notificationsBase,
  useUnreadCount() {
    return useQuery({
      queryKey: ['notifications', 'unread-count'],
      queryFn: () => get<{ count: number }>('/api/v1/notifications/unread-count'),
      refetchInterval: 30_000,
      staleTime: 15_000,
    });
  },
  useMarkAllRead() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: () => put<{ ok: boolean }>('/api/v1/notifications/mark-all-read', {}),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  },
  useMarkRead() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) =>
        put<Notification>(`/api/v1/notifications/${id}`, { readAt: new Date().toISOString() }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    });
  },
};

export const ReportGenerationLogs = createResource<ReportGenerationLog>('/api/v1/report-generation-logs', 'report-generation-logs', 'Report log');

export const ActivityLogs = createCreateOnlyResource<ActivityLog>('/api/v1/activity-logs', 'activity-logs', 'Activity log');

export function useListActivityLogs() {
  return useQuery<ActivityLog[]>({
    queryKey: ['activity-logs', 'list'],
    queryFn: () => get<ActivityLog[]>('/api/v1/activity-logs/list'),
    staleTime: 30_000,
  });
}

export const PlatformConfigurations = createCreateOnlyResource<PlatformConfiguration>('/api/v1/platform-configurations', 'platform-configurations', 'Configuration');
/**
 * Internal user directory (local DB, distinct from the Clerk-backed `ClerkUsers` resource
 * used on the Users page). GET /api/v1/users/directory.
 */

export const Inventory = {
  ...inventoryBase,
  useByProduct(productId: string | undefined) {
    return useQuery({
      queryKey: ['inventory', 'by-product', productId],
      queryFn: () => get<InventoryItem[]>(`/api/v1/inventory/by-product/${productId}`),
      enabled: !!productId,
    });
  }
};

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['inventory', 'valuation'],
    queryFn: () => get<InventoryItem[]>('/api/v1/inventory/valuation'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNextSku(name: string) {
  return useQuery({
    queryKey: ['products', 'next-sku', name],
    queryFn: () => get<{ sku: string }>(`/api/v1/products/next-sku?name=${encodeURIComponent(name)}`),
    enabled: name.trim().length > 0,
  });
}

interface ProductSupplierLinkBody {
  supplierId: string;
  isDefault?: boolean;
  unitCost?: number;
  leadTimeDays?: number;
  minOrderQty?: number;
}

export function useListCountries() {
  return useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn:  () => get<Country[]>('/api/v1/common-utility/countries/list'),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useListStates(countryId: number | null) {
  return useQuery<State[]>({
    queryKey: ['states', countryId],
    queryFn:  () => get<State[]>(`/api/v1/common-utility/states/list?countryId=${countryId}`),
    enabled:  countryId !== null,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useListCities(stateId: number | null) {
  return useQuery<City[]>({
    queryKey: ['cities', stateId],
    queryFn:  () => get<City[]>(`/api/v1/common-utility/cities/list?stateId=${stateId}`),
    enabled:  stateId !== null,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// ── Location image (single image; upload replaces) ────────────────────────────

export const Analytics = {
  useSalesSummary() {
    return useQuery<SalesSummaryData>({
      queryKey: ['analytics', 'sales-summary'],
      queryFn:  () => get<SalesSummaryData>('/api/v1/analytics/sales-summary'),
      staleTime: 5 * 60 * 1000,
    });
  },
  useRevenueTrend(months = 6) {
    return useQuery<RevenueTrendPoint[]>({
      queryKey: ['analytics', 'revenue-trend', months],
      queryFn:  () => get<RevenueTrendPoint[]>('/api/v1/analytics/revenue-trend', { months }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useTopProducts(limit = 10) {
    return useQuery<TopProduct[]>({
      queryKey: ['analytics', 'top-products', limit],
      queryFn:  () => get<TopProduct[]>('/api/v1/analytics/top-products', { limit }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useTopCustomers(limit = 10) {
    return useQuery<TopCustomer[]>({
      queryKey: ['analytics', 'top-customers', limit],
      queryFn:  () => get<TopCustomer[]>('/api/v1/analytics/top-customers', { limit }),
      staleTime: 5 * 60 * 1000,
    });
  },
  usePurchaseSummary() {
    return useQuery<PurchaseSummaryData>({
      queryKey: ['analytics', 'purchase-summary'],
      queryFn:  () => get<PurchaseSummaryData>('/api/v1/analytics/purchase-summary'),
      staleTime: 5 * 60 * 1000,
    });
  },
  usePurchaseTrend(months = 6) {
    return useQuery<PurchaseTrendPoint[]>({
      queryKey: ['analytics', 'purchase-trend', months],
      queryFn:  () => get<PurchaseTrendPoint[]>('/api/v1/analytics/purchase-trend', { months }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useTopSuppliers(limit = 10) {
    return useQuery<TopSupplier[]>({
      queryKey: ['analytics', 'top-suppliers', limit],
      queryFn:  () => get<TopSupplier[]>('/api/v1/analytics/top-suppliers', { limit }),
      staleTime: 5 * 60 * 1000,
    });
  },
  useInventorySummary() {
    return useQuery<InventorySummaryData>({
      queryKey: ['analytics', 'inventory-summary'],
      queryFn:  () => get<InventorySummaryData>('/api/v1/analytics/inventory-summary'),
      staleTime: 5 * 60 * 1000,
    });
  },
  useStockByLocation() {
    return useQuery<StockByLocationPoint[]>({
      queryKey: ['analytics', 'stock-by-location'],
      queryFn:  () => get<StockByLocationPoint[]>('/api/v1/analytics/stock-by-location'),
      staleTime: 5 * 60 * 1000,
    });
  },
};
// ── Fleet Management ──────────────────────────────────────────────────────────
