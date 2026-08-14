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

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  organizationId?: string;
  locationId?: string;
  supplierId?: string;
  createdById?: string;
  poNumber?: string;
  status?: PurchaseOrderStatus;
  expectedAt?: string;
  receivedAt?: string;
  totalAmount?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePurchaseOrderItemInput {
  productId: string;
  quantityOrdered: number;
  unitCost: number;
}

export interface CreatePurchaseOrderInput {
  locationId: string;
  supplierId: string;
  expectedAt?: string;
  notes?: string;
  items: CreatePurchaseOrderItemInput[];
}

export interface ReceivePurchaseOrderItemInput {
  purchaseItemId: string;
  quantityReceived: number;
}

export interface ReceivePurchaseOrderInput {
  locationId: string;
  items: ReceivePurchaseOrderItemInput[];
  notes?: string;
}

/** Sales bill lifecycle — matches core-apis EBillStatus. */

export type BillStatus = 'INITIATED' | 'DRAFT' | 'COMPLETED' | 'CANCELLED';

/** Matches core-apis EPaymentMethod. */

export interface BillItem {
  id: string;
  billId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  organizationId: string;
  locationId: string;
  customerId?: string | null;
  createdById: string;
  walkInName?: string | null;
  walkInPhone?: string | null;
  walkInGstin?: string | null;
  status: BillStatus | string;
  paymentMethod?: PaymentMethod | string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  billedAt?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  items?: BillItem[];
}

export interface CreateBillItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
}

export interface CreateBillInput {
  locationId: string;
  customerId?: string;
  walkInName?: string;
  walkInPhone?: string;
  walkInGstin?: string;
  notes?: string;
  items: CreateBillItemInput[];
}

export interface UpdateBillInput {
  locationId?: string;
  customerId?: string | null;
  walkInName?: string | null;
  walkInPhone?: string | null;
  walkInGstin?: string | null;
  notes?: string | null;
}

// Verified 2026-07-31: CreatePaymentTransactionRequest has no @AutoMap; domain
// orgId vs entity organizationId — create fails. See #0d.

export type EExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  organizationId?: string;
  locationId?: string;
  category?: string;
  amount?: number;
  expenseDate?: string;
  description?: string;
  status?: EExpenseStatus;
  submittedBy?: string;
  createdAt?: string;
}

export interface PurchaseItem {
  id: string;
  purchaseOrderId?: string;
  productId?: string;
  quantityOrdered?: number;
  quantityReceived?: number;
  unitCost?: number;
  totalCost?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type FleetExpenseType = 'fuel' | 'toll' | 'parking' | 'insurance' | 'tax' | 'washing' | 'repair' | 'other';

export interface FleetExpense {
  id: string;
  vehicleId: string;
  organizationId: string;
  expenseType: FleetExpenseType;
  amount: number;
  expenseDate: string;
  description?: string;
  tripId?: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface PurchaseSummaryData {
  spendThisMonth: number;
  outstandingPos: number;
  avgPoValue: number;
  supplierCount: number;
}

export interface PurchaseTrendPoint {
  month: string;
  spend: number;
  poCount: number;
}

export interface TopSupplier {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  poCount: number;
}
