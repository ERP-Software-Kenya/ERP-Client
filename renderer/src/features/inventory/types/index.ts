export interface Store {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  imageKey?: string;
  isActive?: boolean;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LocationType = 'store' | 'warehouse';

export interface Location {
  id: string;
  organizationId?: string;
  name: string;
  type: LocationType;
  imageKey?: string;
  address?: string;
  city?: string;
  state?: string;
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

export interface ItemReturn {
  id: string;
  status?: string;
  totalAmount?: number;
  returnType?: 'sales' | 'purchase';
  locationId?: string;
  orderId?: string;
  supplierId?: string;
  createdAt?: string;
}

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

export interface StockTransferItem {
  productId: string;
  quantitySent: number;
  quantityReceived: number;
}

export interface StockTransfer {
  id: string;
  organizationId: string;
  fromLocationId: string;
  toLocationId: string;
  transferNumber: string;
  status?: string;
  items?: StockTransferItem[];
}

// Verified 2026-07-26 against core-apis's OrderResponse/CreateOrderRequest source
// directly — camelCase, matches the entity well. OrderEntity has no organizationId
// column (tenancy flows through locationId -> location -> org). The real blocker for
// create is that customerId (required) has no valid value to test with, because
// Customers create is broken separately (see Customer below). See Orders.tsx.

export interface TopProduct {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalQtySold: number;
}

export interface StockByLocationPoint {
  locationId: string;
  locationName: string;
  locationType: string;
  totalStock: number;
  productCount: number;
  valuation: number;
}
