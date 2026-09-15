import type { PosReceipt } from './checkout';
import { isBigCustomer } from './posHelpers';

export type SaleDocKind = 'receipt' | 'debtor' | 'statement' | 'delivery';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number) {
  return `KSh ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function linesTable(receipt: PosReceipt) {
  const rows = receipt.lines
    .map(
      (l) => `
      <tr>
        <td>${esc(l.name)}<div class="muted mono">${esc(l.sku)}</div></td>
        <td class="right">${l.qty}</td>
        <td class="right">${fmt(l.rate)}</td>
        <td class="right">${l.taxPct > 0 ? `${l.taxPct}%` : '—'}</td>
        <td class="right">${fmt(l.lineTotal)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table>
      <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Tax</th><th class="right">Amt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function titleFor(kind: SaleDocKind, receipt: PosReceipt) {
  if (kind === 'debtor') return 'Debtor Note';
  if (kind === 'statement') return 'Statement';
  if (kind === 'delivery') return 'Delivery Note';
  return receipt.mode === 'sales' ? 'Sales receipt' : 'Goods receipt';
}

function fmtPlain(n: number) {
  return (n ?? 0).toFixed(2);
}

/** Shared 80mm thermal-receipt body markup — embedded by both the popup-print HTML doc and the in-app print root. */
export function thermalReceiptBodyHtml(receipt: PosReceipt): string {
  const isCash = String(receipt.paymentMethod ?? '').toLowerCase() === 'cash';
  const change =
    isCash && receipt.amountReceived != null ? receipt.amountReceived - receipt.totalAmount : null;

  const rows = receipt.lines
    .map(
      (l) => `
      <tr>
        <td>${esc(l.name)}</td>
        <td class="num">${l.qty}</td>
        <td class="num">${fmtPlain(l.rate)}</td>
        <td class="num">${fmtPlain(l.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  return `
    <div class="center">
      <div class="org-name">${esc(receipt.orgName || receipt.storeName || '—')}</div>
      ${receipt.orgAddress ? `<div class="org-line">${esc(receipt.orgAddress)}</div>` : ''}
      ${receipt.orgPhone ? `<div class="org-line">TEL: ${esc(receipt.orgPhone)}</div>` : ''}
    </div>
    <hr class="rule" />
    <div class="center"><span class="ref-box">Sales Receipt #${esc(receipt.ref)}</span></div>
    ${receipt.servedByName ? `<div class="meta-line">Served By: ${esc(receipt.servedByName)}</div>` : ''}
    <div class="meta-line">${esc(fmtDate(receipt.createdAt))}</div>
    <hr class="rule" />
    <table>
      <thead>
        <tr><th>DESCRIPTION</th><th class="num">QTY</th><th class="num">RATE</th><th class="num">AMOUNT</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <hr class="rule" />
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${fmtPlain(receipt.subtotal)}</span></div>
      <div class="totals-row grand"><span>RECEIPT TOTAL:</span><span>${fmtPlain(receipt.totalAmount)}</span></div>
    </div>
    ${
      isCash && receipt.amountReceived != null
        ? `<div class="totals">
            <div class="totals-row"><span>CASH:</span><span>${fmtPlain(receipt.amountReceived)}</span></div>
            <div class="totals-row"><span>Change:</span><span>${fmtPlain(Math.max(0, change ?? 0))}</span></div>
          </div>`
        : receipt.paymentMethod
          ? `<div class="meta-line" style="margin-top:6px;">Payment: ${esc(String(receipt.paymentMethod).toUpperCase())}</div>`
          : ''
    }
    <hr class="rule" />
    <div class="center footer bold">GOODS ONCE SOLD CANNOT BE RETURNED!</div>
    <div class="center ref-number">${esc(receipt.ref)}</div>`;
}

/**
 * Scoped entirely under .thermal-receipt — reused as a raw <style> tag inside the live app's
 * print root (POSTerminal.tsx), so nothing here may leak onto unrelated tags/classes elsewhere.
 */
export const THERMAL_STYLE = `
  .thermal-receipt, .thermal-receipt * { box-sizing: border-box; margin: 0; padding: 0; }
  .thermal-receipt {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
    width: 76mm;
    margin: 0 auto;
    padding: 2mm 2mm 6mm;
  }
  .thermal-receipt .center { text-align: center; }
  .thermal-receipt .bold { font-weight: 700; }
  .thermal-receipt .org-name { font-size: 14px; font-weight: 700; text-transform: uppercase; }
  .thermal-receipt .org-line { font-size: 10px; }
  .thermal-receipt .rule { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .thermal-receipt .ref-box { border: 1px solid #000; display: inline-block; padding: 2px 8px; margin: 6px 0; font-weight: 700; }
  .thermal-receipt .meta-line { margin: 2px 0; }
  .thermal-receipt table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
  .thermal-receipt th { text-align: left; border-bottom: 1px solid #000; padding: 2px 2px 4px; font-weight: 700; }
  .thermal-receipt th.num, .thermal-receipt td.num { text-align: right; }
  .thermal-receipt td { padding: 3px 2px; vertical-align: top; }
  .thermal-receipt .totals { margin-top: 6px; }
  .thermal-receipt .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .thermal-receipt .totals-row.grand { font-weight: 700; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; }
  .thermal-receipt .footer { margin-top: 10px; font-size: 10px; }
  .thermal-receipt .ref-number { margin-top: 10px; font-size: 10px; letter-spacing: 1px; }
`;

function buildThermalReceiptHtml(receipt: PosReceipt): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Receipt ${esc(receipt.ref)}</title>
<style>${THERMAL_STYLE}</style>
</head>
<body><div class="thermal-receipt">${thermalReceiptBodyHtml(receipt)}</div></body>
</html>`;
}

const CREDIT_TERMS_LABEL: Record<string, string> = {
  before_delivery: 'Before Delivery',
  after_delivery: 'After Delivery',
  half: 'Half Payment',
  cod: 'Cash on Delivery',
};

/** Shared formal-invoice body markup — embedded by both the popup-print HTML doc and the in-app print root. */
export function invoiceBodyHtml(receipt: PosReceipt): string {
  const rows = receipt.lines
    .map(
      (l, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(l.name)}</td>
        <td class="num">${l.qty}</td>
        <td class="num">${fmtPlain(l.rate)}</td>
        <td class="num">0.00</td>
        <td class="num">${l.taxPct}%</td>
        <td class="num">${fmtPlain(l.lineTotal)}</td>
      </tr>`,
    )
    .join('');
  const creditTerms = receipt.paymentTiming
    ? CREDIT_TERMS_LABEL[receipt.paymentTiming] ?? receipt.paymentTiming
    : '';
  const logo = receipt.logoUrl ? `<img src="${esc(receipt.logoUrl)}" alt="" />` : '';

  return `
    <div class="brand">
      ${logo}
      <div>
        <h1>${esc(receipt.orgName || receipt.storeName || '—')}</h1>
        <div class="meta">
          ${receipt.orgAddress ? esc(receipt.orgAddress) : ''}
          ${receipt.orgPhone ? ` · Tel: ${esc(receipt.orgPhone)}` : ''}
        </div>
      </div>
    </div>
    <div class="title">Sales Invoice</div>
    <div class="head-grid">
      <div>
        <div class="label">Invoice To</div>
        <div><strong>${esc(receipt.partyLabel || '—')}</strong></div>
      </div>
      <div class="head-right">
        <div><span class="label">Doc Date</span><span>${esc(fmtDate(receipt.createdAt))}</span></div>
        <div><span class="label">Document No.</span><span>${esc(receipt.ref)}</span></div>
        ${creditTerms ? `<div><span class="label">Credit Terms</span><span>${esc(creditTerms)}</span></div>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>No</th><th>Product Name</th><th class="num">Quantity</th><th class="num">Price</th>
          <th class="num">Disc</th><th class="num">VAT</th><th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#666;">No line items.</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <table>
        <tr><td>Subtotal</td><td class="num">${fmtPlain(receipt.subtotal)}</td></tr>
        <tr><td>VAT</td><td class="num">${fmtPlain(receipt.taxAmount)}</td></tr>
        <tr><td>Discount</td><td class="num">0.00</td></tr>
        <tr class="grand"><td>Total</td><td class="num">${fmtPlain(receipt.totalAmount)}</td></tr>
      </table>
    </div>
    <div class="terms">
      <div class="terms-title">Terms &amp; Conditions of Sale</div>
      <ol>
        <li>Payment terms are strictly as per credit terms from the date of invoice.</li>
        <li>All goods sold remain property of ${esc(receipt.orgName || 'the seller')} until fully paid for.</li>
        <li>Goods once sold are not returnable nor exchangeable.</li>
        <li>Discrepancies should be notified within 3 days from receipt of goods.</li>
      </ol>
    </div>
    <div class="sign-grid">
      <div class="sign-box">
        ${receipt.servedByName ? `<div class="sign-name">${esc(receipt.servedByName)}</div>` : ''}
        Authorized By
      </div>
      <div class="sign-box">Goods Received By &amp; ID No / Company Stamp</div>
    </div>`;
}

/** Scoped entirely under .sales-invoice, for the same in-app-embedding reason as .thermal-receipt above. */
export const INVOICE_STYLE = `
  .sales-invoice, .sales-invoice * { box-sizing: border-box; margin: 0; padding: 0; }
  .sales-invoice {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    font-size: 12px;
    line-height: 1.5;
    max-width: 800px;
    margin: 0 auto;
    padding: 8px 4px;
  }
  .sales-invoice .brand { display: flex; gap: 12px; align-items: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
  .sales-invoice .brand img { height: 48px; }
  .sales-invoice .brand h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; }
  .sales-invoice .brand .meta { color: #444; margin-top: 3px; font-size: 11px; }
  .sales-invoice .title { text-align: center; font-size: 16px; letter-spacing: 0.1em; font-weight: 800; margin: 14px 0; text-decoration: underline; }
  .sales-invoice .head-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .sales-invoice .head-grid .label { color: #555; font-size: 10px; text-transform: uppercase; }
  .sales-invoice .head-right div { display: flex; justify-content: space-between; padding: 2px 0; }
  .sales-invoice .head-right .label { min-width: 120px; }
  .sales-invoice table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .sales-invoice th { border: 1px solid #1a1a1a; background: #eee; text-align: left; padding: 6px; font-size: 10px; text-transform: uppercase; }
  .sales-invoice th.num, .sales-invoice td.num { text-align: right; }
  .sales-invoice td { border: 1px solid #ccc; padding: 6px; }
  .sales-invoice .totals { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .sales-invoice .totals table { width: 260px; }
  .sales-invoice .totals td { border: none; padding: 3px 4px; }
  .sales-invoice .totals .grand td { border-top: 1px solid #1a1a1a; font-weight: 800; font-size: 13px; }
  .sales-invoice .terms { font-size: 10px; color: #333; margin-bottom: 24px; }
  .sales-invoice .terms .terms-title { font-weight: 700; margin-bottom: 4px; }
  .sales-invoice .terms ol { padding-left: 16px; }
  .sales-invoice .terms li { margin-bottom: 2px; }
  .sales-invoice .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px; }
  .sales-invoice .sign-box { border-top: 1px solid #1a1a1a; padding-top: 4px; font-size: 10px; text-align: center; }
  .sales-invoice .sign-name { font-size: 12px; font-weight: 700; margin-bottom: 20px; }
`;

function buildInvoiceHtml(receipt: PosReceipt): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Sales Invoice ${esc(receipt.ref)}</title>
<style>${INVOICE_STYLE}</style>
</head>
<body><div class="sales-invoice">${invoiceBodyHtml(receipt)}</div></body>
</html>`;
}

/** Minimal printable HTML for Electron printToPDF (no React/CSS deps). */
export function buildSaleDocHtml(receipt: PosReceipt, kind: SaleDocKind): string {
  if (kind === 'receipt') {
    return isBigCustomer(receipt) ? buildInvoiceHtml(receipt) : buildThermalReceiptHtml(receipt);
  }

  const title = titleFor(kind, receipt);
  const prev = Number(receipt.creditBalance ?? 0);
  const next = prev + receipt.totalAmount;
  const d = receipt.delivery;

  let body = '';
  if (kind === 'statement') {
    body = `
      <dl>
        <div><dt>Store</dt><dd>${esc(receipt.storeName || '—')}</dd></div>
        <div><dt>Customer</dt><dd>${esc(receipt.partyLabel || '—')}</dd></div>
        ${
          receipt.creditLimit != null
            ? `<div><dt>Credit limit</dt><dd>${fmt(Number(receipt.creditLimit))}</dd></div>`
            : ''
        }
      </dl>
      <div class="box">
        <div class="row"><span>Previous balance</span><span>${fmt(prev)}</span></div>
        <div class="row"><span>This sale</span><span>${fmt(receipt.totalAmount)}</span></div>
        <div class="row total"><span>Balance</span><span>${fmt(next)}</span></div>
      </div>`;
  } else {
    body = `
      <dl>
        ${receipt.storeName ? `<div><dt>Store</dt><dd>${esc(receipt.storeName)}</dd></div>` : ''}
        <div><dt>Customer</dt><dd>${esc(receipt.partyLabel || '—')}</dd></div>
        ${
          receipt.paymentMethod
            ? `<div><dt>Payment</dt><dd>${esc(String(receipt.paymentMethod).toUpperCase())}</dd></div>`
            : ''
        }
        ${
          receipt.paymentTiming
            ? `<div><dt>Timing</dt><dd>${esc(receipt.paymentTiming.replace(/_/g, ' '))}</dd></div>`
            : ''
        }
      </dl>
      ${linesTable(receipt)}
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${fmt(receipt.subtotal)}</span></div>
        <div class="row"><span>Tax</span><span>${fmt(receipt.taxAmount)}</span></div>
        <div class="row total"><span>${kind === 'debtor' ? 'Amount owed' : 'Total'}</span><span>${fmt(receipt.totalAmount)}</span></div>
      </div>
      ${
        kind === 'delivery' && d
          ? `<div class="box">
              <div class="label">Delivery</div>
              ${d.driverName ? `<div class="row"><span>Driver</span><span>${esc(d.driverName)}</span></div>` : ''}
              ${d.companionName ? `<div class="row"><span>With driver</span><span>${esc(d.companionName)}</span></div>` : ''}
              ${d.vehicleNumber ? `<div class="row"><span>Vehicle</span><span>${esc(d.vehicleNumber)}</span></div>` : ''}
              ${d.license ? `<div class="row"><span>License</span><span>${esc(d.license)}</span></div>` : ''}
              ${d.location ? `<div class="row"><span>Location</span><span>${esc(d.location)}</span></div>` : ''}
              ${d.distance ? `<div class="row"><span>Distance</span><span>${esc(d.distance)}</span></div>` : ''}
              ${d.gps ? `<div class="row"><span>GPS</span><span>${esc(d.gps)}</span></div>` : ''}
              ${d.rating ? `<div class="row"><span>Rating</span><span>${esc(d.rating)}</span></div>` : ''}
              ${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}
            </div>`
          : ''
      }`;
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)} ${esc(receipt.ref)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #111; margin: 24px; font-size: 13px; }
  h1 { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #666; margin: 0; text-align: center; }
  .ref { font-family: ui-monospace, monospace; font-size: 16px; font-weight: 700; text-align: center; margin: 8px 0 4px; }
  .date { text-align: center; color: #666; font-size: 11px; margin-bottom: 16px; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
  dl { margin: 0 0 14px; }
  dl div { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; }
  dt { color: #666; }
  dd { margin: 0; font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #666; border-bottom: 1px solid #ddd; padding: 0 0 6px; }
  td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .right { text-align: right; }
  .muted { color: #999; font-size: 10px; }
  .mono { font-family: ui-monospace, monospace; }
  .row { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; color: #555; }
  .total { font-weight: 800; color: #111; font-size: 16px; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px; }
  .box { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-top: 12px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #666; margin-bottom: 8px; font-weight: 700; }
  .note { margin: 8px 0 0; color: #444; }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="ref">${esc(receipt.ref)}</div>
  <div class="date">${esc(fmtDate(receipt.createdAt))}</div>
  <hr />
  ${body}
</body>
</html>`;
}

export function defaultPdfFileName(receipt: PosReceipt, kind: SaleDocKind) {
  const safe = receipt.ref.replace(/[^\w.-]+/g, '_');
  return `${kind}-${safe}.pdf`;
}
