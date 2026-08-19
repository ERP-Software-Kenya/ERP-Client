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

export interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
}

export interface State {
  id: number;
  name: string;
  countryId: number;
}

export interface City {
  id: number;
  name: string;
  stateId: number;
}

// ── Addresses ─────────────────────────────────────────────────────────────────

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

export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CREDIT';

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
  userId?: string;
  orgId?: string;
  title?: string;
  body?: string;
  type?: string;
  readAt?: string | null;
  createdAt?: string;
}

// Verified 2026-07-31: entity field names match, but CreateItemReturnRequest has
// no @AutoMap so Automapper leaves the command empty — create fails until Core
// API adds @AutoMap (or maps manually). No returnNumber / purchaseOrderId. #0e

export interface ReportGenerationLog {
  id: string;
  report_type?: string;
  status?: string;
  created_at?: string;
}

// Matches core-apis StockMovementResponse + StockOperationRequest / AdjustStockRequest.

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

export interface PlatformConfiguration {
  id: string;
  configKey?: string;
  configValue?: Record<string, unknown>;
  description?: string;
  updatedAt?: string;
}

// ── Platform Users (backend /api/v1/users — distinct from the local PIN-based `User` above) ──

export enum EInvitationStatus {
  Pending  = 'pending',
  Accepted = 'accepted',
  Revoked  = 'revoked',
}

export interface InventorySummaryData {
  totalSkus: number;
  lowStockCount: number;
  zeroStockCount: number;
  totalValuation: number;
}
