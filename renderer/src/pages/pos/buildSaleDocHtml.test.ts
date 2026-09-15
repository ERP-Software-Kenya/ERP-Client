import { describe, expect, it } from 'vitest';
import { buildSaleDocHtml } from './buildSaleDocHtml';
import type { PosReceipt } from './checkout';

const base: PosReceipt = {
  ref: 'BILL-9',
  mode: 'sales',
  storeName: 'Main',
  partyLabel: 'Ada',
  paymentMethod: 'cash',
  lines: [{ sku: 'SKU1', name: 'Widget', qty: 2, rate: 10, taxPct: 0, lineTotal: 20 }],
  extraCharges: [],
  subtotal: 20,
  taxAmount: 0,
  totalAmount: 20,
  createdAt: '2026-08-01T10:00:00.000Z',
  synced: true,
  orgName: 'Acme Traders',
  logoUrl: 'https://cdn.example/logo.png',
  orgMeta: 'a@acme.test · 111',
};

describe('buildSaleDocHtml receipt thermal layout (non big-customer)', () => {
  const walkIn: PosReceipt = { ...base, customerType: 'regular', servedByName: 'Dennis Kiplagat' };

  it('switches to the 80mm thermal layout', () => {
    const html = buildSaleDocHtml(walkIn, 'receipt');
    expect(html).toContain('width: 76mm');
    expect(html).toContain('Sales Receipt #BILL-9');
    expect(html).toContain('Served By: Dennis Kiplagat');
    expect(html).toContain('GOODS ONCE SOLD CANNOT BE RETURNED!');
    expect(html).not.toContain('Sales Invoice');
  });

  it('shows plain amounts (no currency symbol), matching the till-roll format', () => {
    const html = buildSaleDocHtml(walkIn, 'receipt');
    expect(html).toContain('20.00');
    expect(html).not.toContain('KSh');
  });

  it('shows a CASH/Change block for cash sales with an amount tendered', () => {
    const html = buildSaleDocHtml({ ...walkIn, amountReceived: 50 }, 'receipt');
    expect(html).toContain('CASH:');
    expect(html).toContain('50.00');
    expect(html).toContain('Change:');
    expect(html).toContain('30.00');
  });

  it('shows a payment-method line instead of Cash/Change for non-cash sales', () => {
    const html = buildSaleDocHtml({ ...walkIn, paymentMethod: 'mpesa' }, 'receipt');
    expect(html).not.toContain('CASH:');
    expect(html).toContain('Payment: MPESA');
  });

  it('uses the thermal layout even for a registered (non-walk-in) regular customer', () => {
    const html = buildSaleDocHtml({ ...base, customerType: 'new' }, 'receipt');
    expect(html).toContain('width: 76mm');
  });

  it('uses the thermal layout when customerType is unset', () => {
    const html = buildSaleDocHtml(base, 'receipt');
    expect(html).toContain('width: 76mm');
  });
});

describe('buildSaleDocHtml receipt invoice layout (big customer)', () => {
  const bigCustomer: PosReceipt = {
    ...base,
    customerType: 'big_customer',
    partyLabel: 'Pramukh Hardwaremart Ltd',
    paymentTiming: 'half',
    servedByName: 'Yogesh',
  };

  it('switches to the formal Sales Invoice layout', () => {
    const html = buildSaleDocHtml(bigCustomer, 'receipt');
    expect(html).toContain('Sales Invoice');
    expect(html).toContain('Pramukh Hardwaremart Ltd');
    expect(html).toContain('Document No.');
    expect(html).not.toContain('GOODS ONCE SOLD CANNOT BE RETURNED!');
  });

  it('maps paymentTiming to a Credit Terms label', () => {
    const html = buildSaleDocHtml(bigCustomer, 'receipt');
    expect(html).toContain('Credit Terms');
    expect(html).toContain('Half Payment');
  });

  it('prints the Authorized By name from servedByName', () => {
    const html = buildSaleDocHtml(bigCustomer, 'receipt');
    expect(html).toContain('Yogesh');
    expect(html).toContain('Authorized By');
  });

  it('does not fabricate SN / CU INV eTIMS numbers', () => {
    const html = buildSaleDocHtml(bigCustomer, 'receipt');
    expect(html).not.toContain('CU INV');
    expect(html).not.toMatch(/\bSN:/);
  });
});
