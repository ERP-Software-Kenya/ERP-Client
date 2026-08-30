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
  PackedOrder, LiveDriverLocation,
} from '../../../types';


export const VehicleTypes = {
  useList() {
    return useQuery<VehicleTypeRef[]>({
      queryKey: ['vehicle-types'],
      queryFn: () => get<VehicleTypeRef[]>('/api/v1/vehicles/vehicle-types/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

export const VehicleBrands = {
  useList() {
    return useQuery<VehicleBrandRef[]>({
      queryKey: ['vehicle-brands'],
      queryFn: () => get<VehicleBrandRef[]>('/api/v1/vehicles/vehicle-brands/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

export const FuelTypes = {
  useList() {
    return useQuery<FuelTypeRef[]>({
      queryKey: ['fuel-types'],
      queryFn: () => get<FuelTypeRef[]>('/api/v1/vehicles/fuel-types/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

export const MaintenanceTypes = {
  useList() {
    return useQuery<MaintenanceTypeRef[]>({
      queryKey: ['maintenance-types'],
      queryFn: () => get<MaintenanceTypeRef[]>('/api/v1/maintenance/maintenance-types/list'),
      staleTime: 5 * 60 * 1000,
    });
  },
};

// ── Dispatch / Field Operations ───────────────────────────────────────────────

export const DispatchOrders = createResource<PackedOrder>('/api/v1/warehouse/orders/queue', 'dispatch-orders', 'Dispatch Order');
export const FleetLiveLocations = createResource<LiveDriverLocation>('/api/v1/field-ops/fleet/live-locations', 'fleet-live-locations', 'Live Location');

// ── Analytics ─────────────────────────────────────────────────────────────────

export const FleetVehicles = createResource<FleetVehicle>('/api/v1/vehicles', 'fleet-vehicles', 'Vehicle');

export const FleetDrivers  = createResource<FleetDriver>('/api/v1/drivers', 'fleet-drivers', 'Driver');

export const FleetTrips    = createResource<FleetTrip>('/api/v1/trips', 'fleet-trips', 'Trip');

export const FleetMaintenanceApi = {
  useCreate() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (body: Partial<FleetMaintenance>) => post<FleetMaintenance>('/api/v1/maintenance', body),
      onSuccess: () => {
        toast.success('Maintenance record created');
        queryClient.invalidateQueries({ queryKey: ['fleet-maintenance'] });
      },
      onError: (err: Error) => toast.error(err.message || 'Failed to create maintenance record'),
    });
  },
};
