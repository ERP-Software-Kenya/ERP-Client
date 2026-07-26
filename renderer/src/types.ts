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
  | 'reports'
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
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Store {
  id: string;
  name: string;
  code?: string;
  address?: string;
  organization_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
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

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
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

// Verified 2026-07-25 against core-apis's StockMovementResponse/StockTransferResponse
// source directly — these two are camelCase in the real API response, unlike most of
// this file (same discrepancy already flagged on ItemReturn above). Creating a
// StockMovement currently 500s server-side regardless of what the client sends —
// see docs/core-apis-fixes.md #2.
export interface StockMovement {
  id: string;
  organizationId: string;
  inventoryId: string;
  userId?: string;
  quantity: number;
  type: string;
  reason?: string;
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
  description?: string;
  amount?: number;
  category?: string;
  status?: string;
  created_at?: string;
}

// Verified 2026-07-26: CreatePurchaseItemRequest is camelCase (purchaseOrderId/
// productId/quantity/unitPrice), unlike most of this file. Create 500s regardless
// — entity's real NOT-NULL columns are quantityOrdered/unitCost, not quantity/
// unitPrice. See docs/core-apis-fixes.md #0b.
export interface PurchaseItem {
  id: string;
  purchaseOrderId?: string;
  productId?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface ActivityLog {
  id: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  created_at?: string;
}

export interface Role {
  id: string;
  name?: string;
  description?: string;
  created_at?: string;
}

export interface UserRole {
  id: string;
  user_id?: string;
  role_id?: string;
  created_at?: string;
}

export interface PlatformConfiguration {
  id: string;
  key?: string;
  value?: string;
  description?: string;
  updated_at?: string;
}

// ── Platform Users (backend /api/v1/users — distinct from the local PIN-based `User` above) ──

export interface PlatformUser {
  id: string;
  clerkUserId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  created_at?: string;
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
