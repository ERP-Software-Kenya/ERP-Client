import { patch, post } from '../../lib/http';
import type { Bill, InventoryItem, PaymentMethod } from '../../types';

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
  storeName?: string;
  /** Locations UUID — bill.locationId and stock source. */
  locationId?: string;
  locationName?: string;
  inventory?: InventoryItem[];
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
  saleType?: 'normal' | 'credit' | 'black';
  customerType?: 'regular' | 'new' | 'shop' | 'big_customer';
  paymentTiming?: 'before_delivery' | 'after_delivery' | 'half' | 'cod';
  partialAmount?: number;
}

export interface PurchaseCheckoutInput {
  locationId: string;
  storeName?: string;
  locationName?: string;
  inventory?: InventoryItem[];
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

function findInventory(
  inventory: InventoryItem[] | undefined,
  productId: string,
  locationId: string,
): InventoryItem | undefined {
  return inventory?.find((i) => i.productId === productId && i.locationId === locationId);
}

function toBillPaymentMethod(method: 'cash' | 'card'): PaymentMethod {
  return method === 'card' ? 'CARD' : 'CASH';
}

/** Apply add/remove for each line; one CheckoutStep per line (honest failures). */
async function runStockLines(
  op: 'add' | 'remove',
  lines: PosLineInput[],
  locationId: string | undefined,
  inventory: InventoryItem[] | undefined,
  referenceId?: string,
): Promise<CheckoutStep[]> {
  const label = op === 'remove' ? 'Stock remove' : 'Stock add';
  if (!locationId) {
    return [
      skipped(
        label,
        'Skipped — pick a stock location (Locations). Orders use Stores; inventory uses Locations.',
      ),
    ];
  }
  if (!inventory?.length) {
    return [skipped(label, 'Skipped — no inventory list loaded')];
  }

  const steps: CheckoutStep[] = [];
  for (const line of lines) {
    const inv = findInventory(inventory, line.productId, locationId);
    const name = `${label}: ${line.name || line.sku || line.productId.slice(0, 8)}`;
    if (!inv) {
      steps.push({
        name,
        status: 'failed',
        message: 'No inventory row for this product at selected location. Create one under Inventory first.',
      });
      continue;
    }
    const attempt = await tryStep(name, () =>
      post(`/api/v1/stock-movements/${op}`, {
        inventoryId: inv.id,
        locationId,
        productId: line.productId,
        quantity: line.qty,
        referenceId,
        referenceType: referenceId ? 'pos' : undefined,
        notes: `POS ${op}`,
      }),
    );
    steps.push(attempt.step);
  }
  return steps;
}

export interface DraftSaleResult {
  /** Present only when the bill made it to DRAFT; steps carry the failure reason otherwise. */
  billId?: string;
  receipt: PosReceipt;
  steps: CheckoutStep[];
}

/**
 * Shared "create bill (INITIATED) → mark DRAFT" path, used by both `runSalesCheckout`
 * (which continues on to COMPLETED) and `holdSale` in POSTerminal.tsx (which stops here).
 */
export async function createDraftSale(input: SalesCheckoutInput): Promise<DraftSaleResult> {
  const steps: CheckoutStep[] = [];
  const walkInName =
    input.customerInfo?.trim() ||
    (input.customerId ? undefined : 'Walk-in');
  const receipt: PosReceipt = {
    ref: localRef('POS'),
    mode: 'sales',
    storeName: input.storeName ?? input.locationName,
    partyLabel:
      input.customerInfo?.trim() ||
      (input.customerId ? `Customer ${input.customerId.slice(0, 8)}…` : 'Walk-in'),
    paymentMethod: input.paymentMethod,
    lines: buildReceiptLines(input.lines),
    extraCharges: input.extraCharges,
    subtotal: input.subtotal,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  if (!input.locationId) {
    steps.push({
      name: 'Validate location',
      status: 'failed',
      message: 'Select a stock location — required for sales bills',
    });
    return { receipt, steps };
  }
  if (input.lines.length === 0) {
    steps.push({ name: 'Validate lines', status: 'failed', message: 'Cart is empty' });
    return { receipt, steps };
  }
  if (!input.customerId?.trim() && !walkInName) {
    steps.push({
      name: 'Validate customer',
      status: 'failed',
      message: 'Walk-in name or customer is required',
    });
    return { receipt, steps };
  }
  if (input.paymentTiming === 'half' && !(Number(input.partialAmount) > 0)) {
    steps.push({
      name: 'Validate payment timing',
      status: 'failed',
      message: 'Enter a partial amount greater than 0 for half payment',
    });
    return { receipt, steps };
  }

  steps.push({
    name: 'Local receipt',
    status: 'ok',
    message: `Issued ${receipt.ref} — ready to print`,
  });

  if (input.extraCharges.length > 0) {
    steps.push(
      skipped(
        'Extra charges',
        'Extra charges stay on the local receipt only (bill lines are products).',
      ),
    );
  }

  const notesParts: string[] = [];
  if (input.extraCharges.length > 0) {
    notesParts.push(
      `POS extras: ${input.extraCharges.map((c) => `${c.label}=${c.amount}`).join(', ')}`,
    );
  }
  if (input.storeName) notesParts.push(`Store: ${input.storeName}`);

  const createAttempt = await tryStep(
    'Create bill',
    () =>
      post<Bill>('/api/v1/bills', {
        locationId: input.locationId,
        customerId: input.customerId?.trim() || undefined,
        walkInName: input.customerId?.trim() ? undefined : walkInName,
        notes: notesParts.length ? notesParts.join(' · ') : undefined,
        saleType: input.saleType,
        customerType: input.customerType,
        paymentTiming: input.paymentTiming,
        partialAmount: input.paymentTiming === 'half' ? input.partialAmount : undefined,
        items: input.lines.map((l) => ({
          productId: l.productId,
          quantity: l.qty,
          unitPrice: l.unitPrice,
          taxRate: l.taxPct,
        })),
      }),
    (b) => b.id,
  );
  steps.push(createAttempt.step);

  if (!createAttempt.result?.id) {
    const msg = createAttempt.step.message || '';
    if (/internal server error/i.test(msg)) {
      steps.push({
        name: 'Create bill hint',
        status: 'failed',
        message:
          'Server 500 on bill create — usually createdById fallback (BillsController has no ClerkAuthGuard). Needs core-apis fix; client payload is valid.',
      });
    }
    return { receipt, steps };
  }

  const billId = createAttempt.result.id;
  if (createAttempt.result.billNumber) {
    receipt.ref = createAttempt.result.billNumber;
  }

  const draftAttempt = await tryStep(
    'Mark draft',
    () => patch<Bill>(`/api/v1/bills/${billId}/status`, { status: 'DRAFT' }),
    (b) => b.id,
  );
  steps.push(draftAttempt.step);
  if (draftAttempt.step.status === 'failed') {
    return { receipt, steps };
  }

  return { receipt, steps, billId };
}

/**
 * Sales: POST bill (INITIATED) → PATCH DRAFT → PATCH COMPLETED.
 * Stock is deducted on the server when COMPLETED — no client stock-remove.
 */
export async function runSalesCheckout(input: SalesCheckoutInput): Promise<CheckoutResult> {
  const { receipt, steps, billId } = await createDraftSale(input);
  if (!billId) {
    return { receipt, steps, primaryOk: false };
  }

  const completeAttempt = await tryStep(
    'Complete bill',
    () =>
      patch<Bill>(`/api/v1/bills/${billId}/status`, {
        status: 'COMPLETED',
        paymentMethod: toBillPaymentMethod(input.paymentMethod),
      }),
    (b) => b.id,
  );
  steps.push(completeAttempt.step);

  if (completeAttempt.step.status !== 'ok') {
    return { receipt, steps, primaryOk: false };
  }

  // Extras inflate local receipt total beyond server bill — do not claim full sync.
  receipt.synced = input.extraCharges.length === 0;
  if (completeAttempt.result?.billNumber) {
    receipt.ref = completeAttempt.result.billNumber;
  }
  steps.push({
    name: 'Inventory',
    status: 'ok',
    message: 'Stock deducted on server (COMPLETED)',
  });
  if (input.extraCharges.length > 0) {
    steps.push({
      name: 'Receipt totals',
      status: 'skipped',
      message: 'Server bill excludes POS extra charges — receipt total is local',
    });
  }

  return { receipt, steps, primaryOk: true };
}

/**
 * Purchase: POST /api/v1/purchase-orders — creates a Draft PO with all line items.
 * Stock is added separately when the verifier receives the order.
 */
export async function runPurchaseCheckout(input: PurchaseCheckoutInput): Promise<CheckoutResult> {
  const steps: CheckoutStep[] = [];
  const extras = input.extraCharges ?? [];
  const receipt: PosReceipt = {
    ref: localRef('PO'),
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

  if (!input.locationId) {
    steps.push({ name: 'Validate location', status: 'failed', message: 'Select a location from the top bar' });
    return { receipt, steps, primaryOk: false };
  }
  if (!input.supplierId) {
    steps.push({ name: 'Validate supplier', status: 'failed', message: 'Select a supplier from the left panel' });
    return { receipt, steps, primaryOk: false };
  }
  if (input.lines.length === 0) {
    steps.push({ name: 'Validate lines', status: 'failed', message: 'Add at least one product' });
    return { receipt, steps, primaryOk: false };
  }

  steps.push({ name: 'Local receipt', status: 'ok', message: `Issued ${receipt.ref}` });

  const createAttempt = await tryStep(
    'Create purchase order',
    () =>
      post<{ id: string; poNumber?: string }>('/api/v1/purchase-orders', {
        locationId: input.locationId,
        supplierId: input.supplierId,
        notes: input.supplierRef || undefined,
        items: input.lines.map((l) => ({
          productId: l.productId,
          quantityOrdered: l.qty,
          unitCost: l.unitPrice,
        })),
      }),
    (po) => po.id,
  );
  steps.push(createAttempt.step);

  if (!createAttempt.result?.id) {
    return { receipt, steps, primaryOk: false };
  }

  if (createAttempt.result.poNumber) {
    receipt.ref = createAttempt.result.poNumber;
  }

  receipt.synced = true;
  steps.push({
    name: 'Draft PO saved',
    status: 'ok',
    message: `PO ${receipt.ref} created with Draft status. Open Purchase Orders to verify and receive stock.`,
  });

  return { receipt, steps, primaryOk: true };
}
