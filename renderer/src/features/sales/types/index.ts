export interface Order {
  id: string;
  orderNumber?: string;
  locationId?: string;
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

// core-apis customers: create sets organizationId from auth/fallback; search/PATCH/DELETE supported.

export interface Customer {
  id: string;
  organizationId?: string;
  name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesSummaryData {
  revenueThisMonth: number;
  revenueThisWeek: number;
  avgBillValue: number;
  activeCustomers: number;
  completedBills: number;
  pendingBills: number;
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  billCount: number;
}

export interface TopCustomer {
  customerId: string | null;
  customerName: string;
  totalSpend: number;
  billCount: number;
}
