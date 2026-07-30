import { post } from '../../lib/http';
import type { Bill, Invoice, Order, PaymentTransaction } from '../../types';

export type CheckoutStepStatus = 'ok' | 'failed' | 'skipped';

export interface CheckoutStep {
  name: string;
  status: CheckoutStepStatus;
  message?: string;
  entityId?: string;
}

export interface PosLineInput {
  productId: string;
  sku?: string;
  name?: string;
  qty: number;
  unitPrice: number;
  taxPct: number;
}

export interface PosReceipt {
  ref: string;
  mode: 'sales' | 'purchase';
  storeName?: string;
  partyLabel?: string;
  paymentMethod?: string;
  lines: Array<{
    sku: string;
    name: string;
    qty: number;
    rate: number;
    taxPct: number;
    lineTotal: number;
  }>;
  extraCharges: Array<{ label: string; amount: number }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  synced: boolean;
}

export interface CheckoutResult {
  receipt: PosReceipt;
  steps: CheckoutStep[];
  /** True when a printable receipt was issued (always for valid cart). */
  primaryOk: boolean;
}

export interface SalesCheckoutInput {
  storeId: string;
  storeName?: string;
  orgId?: string;
  customerId?: string;
  paymentMethod: 'cash' | 'card';
  amountReceived?: number;
  customerInfo?: string;
  lines: PosLineInput[];
  extraCharges: Array<{ label: string; amount: number }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export interface PurchaseCheckoutInput {
  storeId: string;
  storeName?: string;
  orgId?: string;
  supplierId?: string;
  supplierName?: string;
  supplierRef?: string;
  lines: PosLineInput[];
  extraCharges?: Array<{ label: string; amount: number }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

async function tryStep<T>(
  name: string,
  fn: () => Promise<T>,
  idOf?: (r: T) => string | undefined,
): Promise<{ step: CheckoutStep; result?: T }> {
  try {
    const result = await fn();
    return {
      result,
      step: { name, status: 'ok', entityId: idOf?.(result), message: 'Created' },
    };
  } catch (e) {
    return {
      step: {
        name,
        status: 'failed',
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

function skipped(name: string, message: string): CheckoutStep {
  return { name, status: 'skipped', message };
}

function localRef(prefix: string) {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    '-',
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
  return `${prefix}-${stamp}`;
}

function buildReceiptLines(lines: PosLineInput[]) {
  return lines.map((l) => {
    const lineTax = (l.qty * l.unitPrice * l.taxPct) / 100;
    return {
      sku: l.sku || l.productId.slice(0, 8),
      name: l.name || 'Item',
      qty: l.qty,
      rate: l.unitPrice,
      taxPct: l.taxPct,
      lineTotal: l.qty * l.unitPrice + lineTax,
    };
  });
}

export async function runSalesCheckout(input: SalesCheckoutInput): Promise<CheckoutResult> {
  const steps: CheckoutStep[] = [];
  const receipt: PosReceipt = {
    ref: localRef('POS'),
    mode: 'sales',
    storeName: input.storeName,
    partyLabel: input.customerInfo?.trim() || (input.customerId ? `Customer ${input.customerId.slice(0, 8)}…` : 'Walk-in'),
    paymentMethod: input.paymentMethod,
    lines: buildReceiptLines(input.lines),
    extraCharges: input.extraCharges,
    subtotal: input.subtotal,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  if (!input.storeId) {
    steps.push({ name: 'Validate store', status: 'failed', message: 'Select a store' });
    return { receipt, steps, primaryOk: false };
  }
  if (input.lines.length === 0) {
    steps.push({ name: 'Validate lines', status: 'failed', message: 'Cart is empty' });
    return { receipt, steps, primaryOk: false };
  }

  steps.push({
    name: 'Local receipt',
    status: 'ok',
    message: `Issued ${receipt.ref} — ready to print`,
  });

  if (!input.customerId?.trim()) {
    steps.push(
      skipped(
        'Create order / invoice',
        'Walk-in sale — Order API needs a customer UUID. No customer list/create works in API yet, so cloud sync was skipped. Receipt is local only.',
      ),
    );
    steps.push(skipped('Create payment', 'Skipped — no server invoice to attach payment to'));
    steps.push(
      skipped(
        'Stock remove',
        'Skipped — stock-movements/remove needs inventoryId + locationId',
      ),
    );
    return { receipt, steps, primaryOk: true };
  }

  const orderAttempt = await tryStep(
    'Create order',
    () =>
      post<Order>('/api/v1/orders', {
        storeId: input.storeId,
        customerId: input.customerId,
        status: 'CONFIRMED',
        subtotal: input.subtotal,
        taxAmount: input.taxAmount,
        totalAmount: input.totalAmount,
        paymentStatus: input.paymentMethod ? 'PENDING' : undefined,
      }),
    (o) => o.id,
  );
  steps.push(orderAttempt.step);

  if (orderAttempt.result?.id) {
    const invoiceAttempt = await tryStep(
      'Create invoice',
      () =>
        post<Invoice>('/api/v1/invoices', {
          orderId: orderAttempt.result!.id,
          totalAmount: input.totalAmount,
          status: 'ISSUED',
        }),
      (inv) => inv.id,
    );
    steps.push(invoiceAttempt.step);
    if (invoiceAttempt.result) {
      receipt.synced = true;
      receipt.ref = invoiceAttempt.result.invoiceNumber ?? invoiceAttempt.result.id;
      if (input.orgId) {
        const payAttempt = await tryStep(
          'Create payment',
          () =>
            post<PaymentTransaction>('/api/v1/payment-transactions', {
              orgId: input.orgId,
              referenceId: invoiceAttempt.result!.id,
              referenceType: 'invoice',
              type: 'INBOUND',
              method: input.paymentMethod.toUpperCase(),
              amount: input.totalAmount,
              status: 'PENDING',
            }),
          (p) => p.id,
        );
        steps.push(payAttempt.step);
      } else {
        steps.push(skipped('Create payment', 'Skipped — store has no organization id'));
      }
    }
  }

  steps.push(
    skipped(
      'Stock remove',
      'Skipped — stock-movements/remove needs inventoryId + locationId',
    ),
  );

  return { receipt, steps, primaryOk: true };
}

export async function runPurchaseCheckout(input: PurchaseCheckoutInput): Promise<CheckoutResult> {
  const steps: CheckoutStep[] = [];
  const extras = input.extraCharges ?? [];
  const receipt: PosReceipt = {
    ref: localRef('GRN'),
    mode: 'purchase',
    storeName: input.storeName,
    partyLabel: input.supplierName || input.supplierRef || 'Supplier',
    lines: buildReceiptLines(input.lines),
    extraCharges: extras,
    subtotal: input.subtotal,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  if (!input.storeId) {
    steps.push({ name: 'Validate store', status: 'failed', message: 'Select a store' });
    return { receipt, steps, primaryOk: false };
  }
  if (!input.supplierId) {
    steps.push({ name: 'Validate supplier', status: 'failed', message: 'Select a supplier' });
    return { receipt, steps, primaryOk: false };
  }
  if (input.lines.length === 0) {
    steps.push({ name: 'Validate lines', status: 'failed', message: 'Receiving list is empty' });
    return { receipt, steps, primaryOk: false };
  }

  steps.push({
    name: 'Local receipt',
    status: 'ok',
    message: `Issued ${receipt.ref} — ready to print`,
  });

  steps.push(skipped('Create GRN', 'No goods-receipt API yet'));

  if (input.orgId) {
    const billNumber = receipt.ref.replace('GRN', 'BILL');
    const billAttempt = await tryStep(
      'Create bill',
      () =>
        post<Bill>('/api/v1/bills', {
          orgId: input.orgId,
          billNumber,
          amount: input.totalAmount,
          status: 'UNPAID',
        } as Partial<Bill>),
      (b) => b.id,
    );
    steps.push(billAttempt.step);
    if (billAttempt.result) {
      receipt.synced = true;
      receipt.ref = billAttempt.result.billNumber ?? billNumber;
    }
  } else {
    steps.push(skipped('Create bill', 'Skipped — store has no organization id'));
  }

  steps.push(
    skipped('Stock add', 'Skipped — stock-movements/add needs inventoryId + locationId'),
  );
  steps.push(
    skipped(
      'Link supplier',
      `Supplier ${input.supplierId} not sent — CreateBillRequest has no supplierId field`,
    ),
  );

  return { receipt, steps, primaryOk: true };
}
