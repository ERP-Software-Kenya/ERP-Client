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


export const Products = createResource<Product>('/api/v1/products', 'products', 'Product');

export const ItemReturns = createResource<ItemReturn>('/api/v1/item-returns', 'item-returns', 'Return');

export const Locations = createResource<Location>('/api/v1/locations', 'locations', 'Location');
// ── Inventory cluster (hook-based) ─────────────────────────────────────────────

const inventoryBase = createResource<InventoryItem>('/api/v1/inventory', 'inventory', 'Inventory item');

export const Inventory = {
  ...inventoryBase,
  useByProduct(productId: string | undefined) {
    return useQuery({
      queryKey: ['inventory', 'by-product', productId],
      queryFn: () => get<InventoryItem[]>(`/api/v1/inventory/by-product/${productId}`),
      enabled: !!productId,
    });
  },
};

export function useCategoryParents(enabled = true) {
  return useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: () => get<Category[]>('/api/v1/categories/parents'),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export const StockTransfers = {
  useGet(id: string | undefined) {
    return useQuery({
      queryKey: ['stock-transfers', id],
      queryFn: () => get<StockTransfer>(`/api/v1/stock-transfers/${id}`),
      enabled: !!id,
    });
  },
  /** Paginated history — resolves to { items, total }. */
  useSearch(params?: { page?: number; limit?: number; filters?: Record<string, string> }) {
    return useQuery({
      queryKey: ['stock-transfers', 'search', params?.page ?? 1, params?.limit ?? 15, params?.filters ?? {}],
      queryFn: async () => {
        const raw = await get<PaginatedResponse<StockTransfer>>('/api/v1/stock-transfers', {
          $page: params?.page ?? 1,
          $perPage: params?.limit ?? 15,
          ...(params?.filters ?? {}),
        });
        return { items: raw.items ?? [], total: raw.totalCount ?? 0 };
      },
    });
  },
  useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: Partial<StockTransfer>) => post<StockTransfer>('/api/v1/stock-transfers', body),
      onSuccess: () => {
        toast.success('Stock transfer created');
        queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to create stock transfer'),
    });
  },
};

export function useInventoryLowStock() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => get<InventoryItem[]>('/api/v1/inventory/low-stock'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockMovement(id: string | undefined) {
  return useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => get<StockMovement>(`/api/v1/stock-movements/${id}`),
    enabled: !!id,
  });
}

export function useStockMovementsByInventory(inventoryId: string | undefined) {
  return useQuery({
    queryKey: ['stock-movements', 'by-inventory', inventoryId],
    queryFn: () => get<StockMovement[]>(`/api/v1/stock-movements/by-inventory/${inventoryId}`),
    enabled: !!inventoryId,
  });
}

export function useStockOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ op, body }: { op: StockMovementOp; body: StockOperationBody }) =>
      post<unknown>(`/api/v1/stock-movements/${op}`, body).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useCompleteStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: Array<{
        fromInventoryId: string;
        // NEEDS BACKEND: resolve/create this server-side when omitted — see
        // docs/superpowers/plans/2026-08-04-backend-requirements.md
        toInventoryId?: string;
        productId: string;
        fromLocationId: string;
        toLocationId: string;
        quantity: number;
      }>;
    }) => put<StockTransfer>(`/api/v1/stock-transfers/${id}/complete`, { items }),
    onSuccess: () => {
      toast.success('Stock transfer completed');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to complete transfer'),
  });
}

export function useCancelStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => put<StockTransfer>(`/api/v1/stock-transfers/${id}/cancel`, {}),
    onSuccess: () => {
      toast.success('Stock transfer cancelled');
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to cancel transfer'),
  });
}

export function useUnpublishedStockList(params?: { locationId?: string; productId?: string }) {
  return useQuery({
    queryKey: ['unpublished-stock', 'list', params],
    queryFn:  () => get<UnpublishedStock[]>('/api/v1/unpublished-stock', params),
  });
}

export function useUnpublishedStock(id: string | undefined) {
  return useQuery({
    queryKey: ['unpublished-stock', id],
    queryFn: () => get<UnpublishedStock>(`/api/v1/unpublished-stock/${id}`),
    enabled: !!id,
  });
}

export function useUnpublishedStockMovements(unpublishedStockId: string | undefined) {
  return useQuery({
    queryKey: ['unpublished-stock', 'by-record', unpublishedStockId],
    queryFn: () => get<UnpublishedStockMovement[]>(`/api/v1/unpublished-stock/by-record/${unpublishedStockId}`),
    enabled: !!unpublishedStockId,
  });
}

export function useAddUnpublishedStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { locationId: string; productId: string; quantity: number; unitCost?: number; notes?: string }) =>
      post('/api/v1/unpublished-stock/add', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unpublished-stock'] }),
  });
}

export function usePublishUnpublishedStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { unpublishedStockId: string; quantity: number; notes?: string }) =>
      post('/api/v1/unpublished-stock/publish', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unpublished-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useProductLog(id: string | undefined) {
  return useQuery({
    queryKey: ['product-logs', id],
    queryFn: () => get<ProductLog>(`/api/v1/product-logs/${id}`),
    enabled: !!id,
  });
}

export function useProductLogsByProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-logs', 'by-product', productId],
    queryFn: async () => {
      const paged = await get<PaginatedResponse<ProductLog>>(`/api/v1/product-logs/by-product/${productId}`, { perPage: 100 });
      return paged.items ?? [];
    },
    enabled: !!productId,
  });
}

export function useProductLogsByInventory(inventoryId: string | undefined) {
  return useQuery({
    queryKey: ['product-logs', 'by-inventory', inventoryId],
    queryFn: () => get<ProductLog[]>(`/api/v1/product-logs/by-inventory/${inventoryId}`),
    enabled: !!inventoryId,
  });
}
// ── Product subresources (images, suppliers) ──────────────────────────────────

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', productId, 'images'],
    queryFn: () => get<ProductImage[]>(`/api/v1/products/${productId}/images`),
    enabled: !!productId,
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<ProductImage>(`/api/v1/products/${productId}/images`, form);
    },
    onSuccess: (_result, { productId }) => {
      queryClient.invalidateQueries({ queryKey: ['products', productId, 'images'] });
    },
  });
}

const PRODUCT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
]);

/**
 * Direct R2 upload via presigned URL. Does NOT create a product_images row —
 * Core API has no confirm/imageKey endpoint yet. Do not invalidate gallery queries.
 */

export function useProductImagePresignedUpload() {
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const mimeType = file.type;
      if (!PRODUCT_IMAGE_MIME_TYPES.has(mimeType)) {
        throw new Error(`Unsupported image type: ${mimeType || 'unknown'}`);
      }
      const meta = await get<ProductImageUploadUrl>(`/api/v1/products/${productId}/image/presigned-url`, {
        mimeType,
      });
      const resp = await fetch(meta.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });
      if (!resp.ok) {
        throw new Error(`R2 upload failed (HTTP ${resp.status})`);
      }
      return meta;
    },
  });
}

export function useProductSuppliers(productId: string | undefined) {
  return useQuery({
    queryKey: ['products', productId, 'suppliers'],
    queryFn: () => get<ProductSupplier[]>(`/api/v1/products/${productId}/suppliers`),
    enabled: !!productId,
  });
}

export function useLinkProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductSupplierLinkBody) => post<ProductSupplier>(`/api/v1/products/${productId}/suppliers`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

export function useUpdateProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, body }: { supplierId: string; body: Omit<ProductSupplierLinkBody, 'supplierId'> }) =>
      put<ProductSupplier>(`/api/v1/products/${productId}/suppliers/${supplierId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

export function useUnlinkProductSupplier(productId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) => del(`/api/v1/products/${productId}/suppliers/${supplierId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'suppliers'] }),
  });
}

// ── Common Utility — Countries / States / Cities ─────────────────────────────

export function useUploadLocationImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, file }: { locationId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return uploadForm<Location>(`/api/v1/locations/${locationId}/image`, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  });
}

export function useRemoveLocationImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locationId: string) => del(`/api/v1/locations/${locationId}/image`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations'] }),
  });
}

// ── Clerk User Management ───────────────────────────────────────────────────

const CLERK_USERS_KEY       = 'clerk-users';
const CLERK_INVITATIONS_KEY = 'clerk-invitations';

/** Backend returns clerkUserId only — add `id` so rows satisfy DataTable's `{ id: string }`. */
function withId(res: ClerkUserListResponse): ClerkUserListResponse {
  return { ...res, data: res.data.map((u) => ({ ...u, id: u.clerkUserId })) };
}
