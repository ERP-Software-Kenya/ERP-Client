// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

// ── App Settings ──────────────────────────────────────────────────────────────
export interface AppSettings {
  apiBaseUrl: string;
  apiToken: string | null;
  lockTimeoutMinutes: number;
  theme: 'dark' | 'light';
}

export type AppUserRole = 'admin' | 'operator';

export interface User {
  id: number;
  username: string;
  name: string;
  role: AppUserRole;
  status: 'active' | 'inactive';
  last_activity?: string;
}

export interface Session {
  id: string;
  user_id: number;
}

// ── Navigation Tabs ───────────────────────────────────────────────────────────
export type Tab =
  | 'dashboard'
  | 'notifications'
  | 'activity-logs'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'stock-movements'
  | 'stock-transfers'
  | 'item-returns'
  | 'orders'
  | 'invoices'
  | 'customers'
  | 'purchase-orders'
  | 'purchase-items'
  | 'suppliers'
  | 'bills'
  | 'stores'
  | 'payment-transactions'
  | 'expenses'
  | 'report-generation-logs'
  | 'users'
  | 'roles'
  | 'user-roles'
  | 'organizations'
  | 'platform-configurations'
  | 'vehicles'
  | 'settings'
  | 'payments';

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

export interface OrgAddress {
  id: string;
  organizationId: string;
  type?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  isPrimary?: boolean;
  createdAt?: string;
}

export interface UserAddress {
  id: string;
  userId: string;
  type?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
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

// Verified 2026-07-26 directly against the deployed API's live responses (not
// just source): CreateInventoryRequest/InventoryResponse are `{name?: string}`
// scaffold-only, same bug class as PurchaseOrder (docs/core-apis-fixes.md #11).
// product_id/store_id/quantity/min_quantity/unit/status below do NOT round-trip
// through the API today even though InventoryItemEntity likely has them in the
// DB — kept only so any code expecting them still compiles; do not trust them.
export interface InventoryItem {
  id: string;
  name?: string;
  product_id?: string;
  store_id?: string;
  quantity?: number;
  min_quantity?: number;
  unit?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Matches core-apis' real InventoryResponse DTO (camelCase). Used only by the
// low-stock/valuation endpoints below — InventoryItem above is a separate,
// pre-existing, verified-wrong type still used by the generic Inventory resource.
export interface InventoryStockLevel {
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

// Verified 2026-07-26 against core-apis source: CreatePurchaseOrderRequest/
// UpdatePurchaseOrderRequest/PurchaseOrderResponse only carry `name` — the fields
// below (supplier_id/store_id/total_amount/status/ordered_at) exist on the real
// DB entity but are NOT reachable through the API at all today. Kept here only so
// existing Phase 1 code compiles; do not trust them to round-trip. See
// docs/core-apis-fixes.md #0.
export interface PurchaseOrder {
  id: string;
  name?: string;
  supplier_id?: string;
  store_id?: string;
  total_amount?: number;
  status?: string;
  ordered_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Verified 2026-07-26 against core-apis's BillResponse/CreateBillRequest source
// directly — the real wire contract is orgId/billNumber/amount/status, not
// purchase_order_id/amount/due_date. Create 500s regardless: the entity's real
// NOT-NULL columns are supplierId/storeId/totalAmount, which nothing in this DTO
// sets. There is no field anywhere linking a Bill to a PurchaseOrder. See
// docs/core-apis-fixes.md #0c.
export interface Bill {
  id: string;
  orgId?: string;
  billNumber?: string;
  amount?: number;
  status?: string;
  created_at?: string;
}

// Verified 2026-07-26 against core-apis's PaymentTransactionResponse/
// CreatePaymentTransactionRequest source directly. referenceId+referenceType is
// the confirmed linkage pattern (e.g. referenceType: 'bill', referenceId: <bill.id>).
// Create 500s regardless — domain model uses orgId, entity column is
// organizationId. See docs/core-apis-fixes.md #0d.
export interface PaymentTransaction {
  id: string;
  orgId?: string;
  referenceId?: string;
  referenceType?: string;
  type?: string;
  method?: string;
  amount?: number;
  status?: string;
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

// Verified 2026-07-26 against core-apis's ItemReturnResponse/CreateItemReturnRequest
// source directly — fully camelCase, matches the entity exactly (this is the one
// clean full-CRUD resource found in the Phase 2 investigation, see
// docs/core-apis-fixes.md #0e). There is no `return_number`/`returnNumber` field —
// that was a guess, not real. `orderId` is a real FK to Orders (sales), it cannot
// reference a PurchaseOrder.
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
// directly — camelCase, matches the entity well. Create 500s regardless: entity's
// NOT-NULL organizationId is never set by the command. See docs/core-apis-fixes.md #8.
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

// Verified 2026-07-26 against core-apis's CustomerResponse/CreateCustomerRequest
// source directly. Create 500s regardless: entity's NOT-NULL organizationId is
// never set by the command. See docs/core-apis-fixes.md #8.
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
