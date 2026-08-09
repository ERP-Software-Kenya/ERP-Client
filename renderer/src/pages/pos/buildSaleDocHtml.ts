import type { PosReceipt } from './checkout';

export type SaleDocKind = 'receipt' | 'debtor' | 'statement' | 'delivery';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        <td class="right">${fmt(l.lineTotal)}</td>
      </tr>`,
    )
    .join('');
  return `
    <table>
      <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Amt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function titleFor(kind: SaleDocKind, receipt: PosReceipt) {
  if (kind === 'debtor') return 'Debtor Note';
  if (kind === 'statement') return 'Statement';
  if (kind === 'delivery') return 'Delivery Note';
  return receipt.mode === 'sales' ? 'Sales receipt' : 'Goods receipt';
}

/** Minimal printable HTML for Electron printToPDF (no React/CSS deps). */
export function buildSaleDocHtml(receipt: PosReceipt, kind: SaleDocKind): string {
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
