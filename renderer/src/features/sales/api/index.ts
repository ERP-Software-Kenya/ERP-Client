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


export const Orders = createCreateOnlyResource<Order>('/api/v1/orders', 'orders', 'Order');

export const Invoices = createCreateOnlyResource<Invoice>('/api/v1/invoices', 'invoices', 'Invoice');

const customersBase = createResource<Customer>('/api/v1/customers', 'customers', 'Customer');

/**
 * Customers SearchCustomersRequest: same $page/$perPage string→@IsNumber 400 as bills.
 * Omit pagination; only send name/phone/filters. Handler defaults to page 1 / 20.
 */

export const Customers = {
  ...customersBase,
  useSearch(params?: {
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, string>;
    enabled?: boolean;
  }) {
    return customersBase.useSearch({ ...params, omitPagination: true });
  },
  useUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Customer> }) =>
        patch<Customer>(`/api/v1/customers/${id}`, body),
      onSuccess: () => {
        toast.success('Customer updated');
        queryClient.invalidateQueries({ queryKey: ['customers'] });
      },
      onError: (error: Error) => toast.error(error.message || 'Failed to update customer'),
    });
  },
};
