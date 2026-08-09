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


export const Suppliers = createResource<Supplier>('/api/v1/suppliers', 'suppliers', 'Supplier');
const purchaseOrdersBase = createResource<PurchaseOrder>('/api/v1/purchase-orders', 'purchase-orders', 'Purchase order');

export const PurchaseOrders = {
  ...purchaseOrdersBase,
  useCreatePO() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: CreatePurchaseOrderInput) =>
        post<PurchaseOrder>('/api/v1/purchase-orders', body),
      onSuccess: () => {
        toast.success('Purchase order created');
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to create purchase order'),
    });
  },
  useGetItems(purchaseOrderId: string | undefined) {
    return useQuery({
      queryKey: ['purchase-items', 'by-order', purchaseOrderId],
      queryFn: () => get<PurchaseItem[]>(`/api/v1/purchase-items/by-order/${purchaseOrderId as string}`),
      enabled: !!purchaseOrderId,
    });
  },
  useReceive() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: ReceivePurchaseOrderInput }) =>
        post<PurchaseOrder>(`/api/v1/purchase-orders/${id}/receive`, body),
      onSuccess: () => {
        toast.success('Purchase order received');
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to receive purchase order'),
    });
  },
};

const billsBase = createResource<Bill>('/api/v1/bills', 'bills', 'Bill');

/**
 * Bills SearchBillsRequest uses @IsNumber() on $page/$perPage without @Type(() => Number).
 * Sending those query params returns 400 on Render — omit them (handler defaults page 1 / 20).
 */

export const Bills = {
  ...billsBase,
  useSearch(params?: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string>;
    enabled?: boolean;
  }) {
    return billsBase.useSearch({ ...params, omitPagination: true });
  },
  useTransitionStatus() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        id,
        status,
        paymentMethod,
      }: {
        id: string;
        status: BillStatus;
        paymentMethod?: PaymentMethod;
      }) => patch<Bill>(`/api/v1/bills/${id}/status`, { status, paymentMethod }),
      onSuccess: (_bill, vars) => {
        toast.success(`Bill marked ${vars.status}`);
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update bill status'),
    });
  },
  useAddItem() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: CreateBillItemInput }) =>
        post<Bill>(`/api/v1/bills/${id}/items`, body),
      onSuccess: () => {
        toast.success('Item added');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to add item'),
    });
  },
  useUpdateItem() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({
        id,
        itemId,
        body,
      }: {
        id: string;
        itemId: string;
        body: Partial<CreateBillItemInput>;
      }) => put<Bill>(`/api/v1/bills/${id}/items/${itemId}`, body),
      onSuccess: () => {
        toast.success('Item updated');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update item'),
    });
  },
  useRemoveItem() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
        del(`/api/v1/bills/${id}/items/${itemId}`).then(() => undefined),
      onSuccess: () => {
        toast.success('Item removed');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to remove item'),
    });
  },
  useUpdateHeader() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: UpdateBillInput }) =>
        put<Bill>(`/api/v1/bills/${id}`, body),
      onSuccess: () => {
        toast.success('Bill updated');
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update bill'),
    });
  },
};

export const Expenses = createCreateOnlyResource<Expense>('/api/v1/expenses', 'expenses', 'Expense');

export const ExpensesApi = {
  useList(status?: string) {
    return useQuery<Expense[]>({
      queryKey: ['expenses', 'list', status ?? 'all'],
      queryFn: () => get<Expense[]>('/api/v1/expenses/list', status ? { status } : undefined),
      staleTime: 30_000,
    });
  },
  useUpdateStatus() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        patch<Expense>(`/api/v1/expenses/${id}/status`, { status }),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ['expenses', 'list'] });
        toast.success('Expense status updated');
      },
      onError: () => toast.error('Failed to update expense status'),
    });
  },
};

export const PurchaseItems = createCreateOnlyResource<PurchaseItem>('/api/v1/purchase-items', 'purchase-items', 'Purchase item');

export const FleetExpensesApi = {
  useGet(id: string | undefined) {
    return useQuery<FleetExpense>({
      queryKey: ['fleet-expenses', id],
      queryFn: () => get<FleetExpense>(`/api/v1/vehicle-expenses/${id as string}`),
      enabled: !!id,
    });
  },
  useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: Partial<FleetExpense>) => post<FleetExpense>('/api/v1/vehicle-expenses', body),
      onSuccess: () => {
        toast.success('Expense recorded');
        queryClient.invalidateQueries({ queryKey: ['fleet-expenses'] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to record expense'),
    });
  },
  useDelete() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => del(`/api/v1/vehicle-expenses/${id}`),
      onSuccess: () => {
        toast.success('Expense deleted');
        queryClient.invalidateQueries({ queryKey: ['fleet-expenses'] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to delete expense'),
    });
  },
};

const PAGE_ACCESS_KEY = 'page-access';
