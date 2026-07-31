// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

// ── Entities ──────────────────────────────────────────────────────────────────

// ── snake_case fields match actual API response field names ────────────────────

export interface Organization {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Store {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  organization_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export type LocationType = 'store' | 'warehouse';

export interface Location {
  id: string;
  organizationId?: string;
  name: string;
  type: LocationType;
  imageKey?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Verified against core-apis source (categories.controller.ts, create/update-category.request.ts,
// category.response.ts): fields are camelCase, there is no `code` field, and status is the boolean
// `isActive` (settable only via update, not create).
export interface Category {
  id: string;
  organizationId?: string;
  parentId?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Verified 2026-07-26 against core-apis source (products.controller.ts,
// create/update-product.request.ts): fields are camelCase and there is no
// snake_case conversion layer in api.ts, so these names must match the wire
// format exactly. `unit` is a fixed backend enum, not free text.
export type ProductUnit = 'piece' | 'kg' | 'gram' | 'litre' | 'ml' | 'box' | 'pack' | 'dozen';

export interface Product {
  id: string;
  organizationId?: string;
  categoryId?: string;
  createdById?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  unit?: ProductUnit;
  costPrice?: number;
  retailPrice?: number;
  loyaltyPrice?: number;
  wholesalePrice?: number;
  transferPrice?: number;
  reorderPoint?: number;
  isActive?: boolean;
  createdAt?: string;
}

// GET/POST/PUT/DELETE /api/v1/products/:id/suppliers[...] — links a Supplier to a Product.
export interface ProductSupplier {
  id: string;
  productId: string;
  supplierId: string;
  isDefault: boolean;
  unitCost?: number;
  leadTimeDays?: number;
  minOrderQty?: number;
  createdAt?: string;
  updatedAt?: string;
}

// GET/POST /api/v1/products/:id/images — separate from the Product record.
export interface ProductImage {
  id: string;
  productId: string;
  storageKey: string;
  sortOrder: number;
  isPrimary: boolean;
  uploadedById?: string;
  url?: string;
  createdAt: string;
}

/** Response from GET /api/v1/products/:id/image/presigned-url */
export interface ProductImageUploadUrl {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

// Matches core-apis' InventoryResponse DTO (camelCase). Verified 2026-07-30
// against src/application/modules/inventory source — the module was fully
// overhauled 2026-07-28 (commit 49a1426), after which this became the real
// wire shape for search/list/getById/create/update on `/api/v1/inventory`.
export interface InventoryItem {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
  maxStock?: number;
  averageCost?: number;
  binLocation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  taxId?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Verified 2026-07-31 (local core-apis): response/domain only id+name(+dates).
// Entity has storeId/supplierId/poNumber/totalAmount but create persists `{ name }`
// only and entity has no `name` column — create always fails. See #0.
export interface PurchaseOrder {
  id: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
}

// Verified 2026-07-31: Swagger CreateBillRequest is orgId/billNumber/amount, but
// command/entity need supplierId/storeId/totalAmount; request has no @AutoMap —
// create always fails. Bill→BillResponse only maps id/status/createdAt. See #0c.
export interface Bill {
  id: string;
  orgId?: string;
  billNumber?: string;
  amount?: number;
  totalAmount?: number;
  supplierId?: string;
  storeId?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

// Verified 2026-07-31: CreatePaymentTransactionRequest has no @AutoMap; domain
// orgId vs entity organizationId — create fails. See #0d.
export interface PaymentTransaction {
  id: string;
  orgId?: string;
  organizationId?: string;
  referenceId?: string;
  referenceType?: string;
  type?: string;
  method?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  created_at?: string;
}

// Verified 2026-07-31: entity field names match, but CreateItemReturnRequest has
// no @AutoMap so Automapper leaves the command empty — create fails until Core
// API adds @AutoMap (or maps manually). No returnNumber / purchaseOrderId. #0e
export interface ItemReturn {
  id: string;
  status?: string;
  totalAmount?: number;
  returnType?: 'sales' | 'purchase';
  storeId?: string;
  orderId?: string;
  supplierId?: string;
  createdAt?: string;
}

export interface ReportGenerationLog {
  id: string;
  report_type?: string;
  status?: string;
  created_at?: string;
}

// Matches core-apis StockMovementResponse + StockOperationRequest / AdjustStockRequest.
export type StockMovementOp =
  | 'add'
  | 'remove'
  | 'adjust'
  | 'reserve'
  | 'release-reservation'
  | 'damage'
  | 'write-off';

export interface StockOperationBody {
  inventoryId: string;
  locationId: string;
  productId: string;
  quantity?: number;
  absoluteQuantity?: number;
  unitCost?: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  inventoryId: string;
  locationId: string;
  productId: string;
  performedById?: string;
  referenceId?: string;
  referenceType?: string;
  movementType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost?: number;
  notes?: string;
  createdAt?: string;
}

export interface UnpublishedStock {
  id: string;
  organizationId: string;
  locationId: string;
  productId: string;
  quantityOnHand: number;
  averageCost?: number;
  binLocation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnpublishedStockMovement {
  id: string;
  unpublishedStockId: string;
  locationId: string;
  productId: string;
  performedById?: string;
  movementType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCost?: number;
  notes?: string;
  createdAt?: string;
}

export interface ProductLog {
  id: string;
  organizationId: string;
  productId: string;
  inventoryId?: string;
  locationId?: string;
  performedById?: string;
  action: string;
  changedFields?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface StockTransfer {
  id: string;
  organizationId: string;
  fromStoreId: string;
  toStoreId: string;
  transferNumber: string;
  status?: string;
}

// Verified 2026-07-26 against core-apis's OrderResponse/CreateOrderRequest source
// directly — camelCase, matches the entity well. OrderEntity has no organizationId
// column (tenancy flows through storeId -> store -> org). The real blocker for
// create is that customerId (required) has no valid value to test with, because
// Customers create is broken separately (see Customer below). See Orders.tsx.
export interface Order {
  id: string;
  orderNumber?: string;
  storeId?: string;
  customerId?: string;
  status?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  paymentStatus?: string;
}

// Verified 2026-07-26 against core-apis's InvoiceResponse/CreateInvoiceRequest
// source directly — the cleanest resource found in this investigation (no
// organizationId needed, invoiceNumber auto-generated server-side). Not live-tested
// — treat as unverified, not working, given every other create tested this session
// failed regardless of DTO cleanliness (see docs/core-apis-fixes.md callout).
export interface Invoice {
  id: string;
  orderId?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  status?: string;
}

// Verified 2026-07-31 (local core-apis): CreateCustomerCommand has no
// organizationId; controller has no ClerkAuthGuard / @CurrentUser injection —
// NOT NULL organizationId always fails. Body cannot work around it. See #8.
export interface Customer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
}

export interface Expense {
  id: string;
  organizationId?: string;
  storeId?: string;
  category?: string;
  amount?: number;
  expenseDate?: string;
  description?: string;
  createdAt?: string;
}

// Verified 2026-07-28 directly against core-apis source (purchase-item.entity.ts):
// CreatePurchaseItemRequest sends quantity/unitPrice, but the entity's real NOT-NULL
// columns are quantityOrdered/unitCost with no default — every create fails on the
// backend with a NOT NULL violation. This is a real backend bug, not a client fix.
export interface PurchaseItem {
  id: string;
  purchaseOrderId?: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
}

export const ACTIVITY_LOG_ACTIONS = [
  'login', 'logout',
  'add_stock', 'remove_stock', 'adjust_stock', 'transfer_stock',
  'create_product', 'update_product', 'delete_product',
  'create_purchase_order', 'receive_purchase_order', 'cancel_purchase_order',
  'create_store', 'update_store',
  'create_user', 'update_user', 'deactivate_user',
] as const;

export interface ActivityLog {
  id: string;
  organizationId?: string;
  userId?: string;
  action?: string;
  entityName?: string;
  entityId?: string;
  createdAt?: string;
}

// Verified 2026-07-28 against role.entity.ts: `name` is a Postgres enum (4 fixed
// values, unique) — free text will fail. organizationId/permissions are required by
// CreateRoleRequest validation but RoleEntity has no matching columns, so the backend
// silently discards them after accepting the request.
export const ROLE_NAMES = ['super_admin', 'org_admin', 'store_manager', 'store_staff'] as const;

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
  storeId?: string;
  createdAt?: string;
}

export interface PlatformConfiguration {
  id: string;
  configKey?: string;
  configValue?: Record<string, unknown>;
  description?: string;
  updatedAt?: string;
}

// ── Platform Users (backend /api/v1/users — distinct from the local PIN-based `User` above) ──

export interface PlatformUser {
  id: string;
  organizationId?: string;
  storeId?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
}

// ── Fleet / Vehicles ──────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  registration_number: string;
  vin?: string;
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  status?: 'In Transit' | 'Available' | 'Maintenance' | 'Out of Service';
  fuel_level?: number;         // percent 0-100
  tire_psi?: number;
  engine_temp?: number;        // °F
  current_speed?: number;      // MPH
  load_weight?: number;        // tons
  current_location?: string;
  driver_name?: string;
  driver_cdl?: string;
  driver_experience?: string;
  last_service_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  date: string;
  service_type: string;
  provider: string;
  cost: number;
  status: 'Completed' | 'Scheduled' | 'In Progress';
}
