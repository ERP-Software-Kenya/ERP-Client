import { toast } from 'sonner';
import { get } from '../../lib/http';
import type { Bill, Customer, CustomerCreditTransaction, PaginatedResponse } from '../../types';
import { amountInWords } from './amountInWords';
import { buildCreditorStatement, withRunningBalance, type CreditorLedgerRow } from './statement';

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n: number) {
  if (!n) return '';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function pageItems<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'object') return [];
  const row = raw as Record<string, unknown>;
  const list = row.items ?? row['items'];
  return Array.isArray(list) ? (list as T[]) : [];
}

export type CreditorStatementPdfInput = {
  orgName: string;
  orgPhone?: string;
  orgAddress?: string;
  logoUrl?: string;
  customerName: string;
  customerAddress?: string;
  pinCode?: string;
  shopName?: string;
  currentOwed: number;
  rows: CreditorLedgerRow[];
};

export function buildCreditorStatementHtml(input: CreditorStatementPdfInput): string {
  const first = input.rows[0]?.date;
  const last = input.rows[input.rows.length - 1]?.date;
  const range =
    first && last ? `${esc(fmtDate(first))} to ${esc(fmtDate(last))}` : esc(fmtDate(new Date().toISOString()));
  const asOn = last ? fmtDate(last) : fmtDate(new Date().toISOString());
  const rows = input.rows
    .map(
      (r, i) => `
      <tr class="${i % 2 ? 'alt' : ''}">
        <td>${esc(fmtDate(r.date))}</td>
        <td>${esc(r.invNo || '—')}</td>
        <td>${esc(r.description)}</td>
        <td class="num">${esc(money(r.debit))}</td>
        <td class="num">${esc(money(r.credit))}</td>
        <td class="num">${esc(money(r.balance))}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Customer Account Statement</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #123; margin: 28px; font-size: 12px; }
  .brand { display: flex; gap: 12px; align-items: center; }
  .brand img { height: 42px; }
  h1 { margin: 0; font-size: 22px; color: #1e4b8e; }
  .meta { color: #555; margin-top: 4px; }
  .title { text-align: center; font-size: 16px; letter-spacing: .08em; font-weight: 800; margin: 18px 0 10px; }
  .range { text-align: center; border: 1px solid #1e4b8e; display: inline-block; padding: 4px 12px; margin: 0 auto 16px; }
  .wrap { text-align: center; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .box { border: 1px solid #c5d4ea; padding: 10px; }
  .box h2 { margin: 0 0 6px; font-size: 11px; color: #1e4b8e; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e4b8e; color: #fff; text-align: left; padding: 8px; font-size: 10px; letter-spacing: .06em; }
  th.num, td.num { text-align: right; }
  td { padding: 7px 8px; border-bottom: 1px solid #e6eef8; }
  tr.alt td { background: #f4f7fb; }
  .foot { margin-top: 16px; background: #e8f0fb; border: 1px solid #c5d4ea; padding: 12px; }
  .bal { font-size: 18px; font-weight: 800; color: #1e4b8e; }
  .words { margin-top: 6px; font-style: italic; }
  .thanks { text-align: center; margin-top: 18px; color: #555; }
</style>
</head>
<body>
  <div class="brand">
    ${input.logoUrl ? `<img src="${esc(input.logoUrl)}" alt="" />` : ''}
    <div>
      <h1>${esc(input.orgName)}</h1>
      <div class="meta">${[input.orgAddress, input.orgPhone].filter(Boolean).map(esc).join(' · ')}</div>
    </div>
  </div>
  <div class="title">CUSTOMER ACCOUNT STATEMENT</div>
  <div class="wrap"><div class="range">Statement date: ${range}</div></div>
  <div class="grid">
    <div class="box">
      <h2>Our business</h2>
      <div>${esc(input.orgName)}</div>
      ${input.orgAddress ? `<div>${esc(input.orgAddress)}</div>` : ''}
      ${input.orgPhone ? `<div>${esc(input.orgPhone)}</div>` : ''}
    </div>
    <div class="box">
      <h2>Billed to</h2>
      <div>${esc(input.customerName)}</div>
      ${input.shopName ? `<div>${esc(input.shopName)}</div>` : ''}
      ${input.customerAddress ? `<div>${esc(input.customerAddress)}</div>` : ''}
      ${input.pinCode ? `<div>PIN: ${esc(input.pinCode)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>DATE</th>
        <th>INV NO</th>
        <th>DESCRIPTION</th>
        <th class="num">DEBIT AMOUNT</th>
        <th class="num">CREDIT AMOUNT</th>
        <th class="num">BALANCE</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="6">No credit sales or payments in this window.</td></tr>`}</tbody>
  </table>
  <div class="foot">
    <div>CURRENT BALANCE (AS ON ${esc(asOn)})</div>
    <div class="bal">${esc(money(input.currentOwed) || '0.00')}</div>
    <div class="words">${esc(amountInWords(input.currentOwed))}</div>
  </div>
  <p class="thanks">Thank you for your continued support and trust in us.</p>
</body>
</html>`;
}

export async function printCreditorStatement(opts: {
  customerId: string;
  orgName: string;
  orgPhone?: string;
  orgAddress?: string;
  logoUrl?: string;
}): Promise<void> {
  const [customer, billsRaw, txRaw] = await Promise.all([
    get<Customer>(`/api/v1/customers/${opts.customerId}`),
    get<PaginatedResponse<Bill>>(`/api/v1/customers/${opts.customerId}/bills`, {
      $page: 1,
      $perPage: 100,
    }),
    get<PaginatedResponse<CustomerCreditTransaction>>(
      `/api/v1/customers/${opts.customerId}/credit-transactions`,
      { $page: 1, $perPage: 100 },
    ),
  ]);
  const currentOwed = Number(customer.creditBalance ?? 0);
  const ledger = withRunningBalance(
    buildCreditorStatement(pageItems<Bill>(billsRaw), pageItems<CustomerCreditTransaction>(txRaw)),
    currentOwed,
  );
  const html = buildCreditorStatementHtml({
    orgName: opts.orgName,
    orgPhone: opts.orgPhone,
    orgAddress: opts.orgAddress,
    logoUrl: opts.logoUrl,
    customerName: customer.name || 'Unnamed',
    customerAddress: customer.address,
    pinCode: customer.pinCode,
    shopName: customer.shopName,
    currentOwed,
    rows: ledger,
  });
  const fileName = `statement-${(customer.name || customer.id).replace(/[^\w.-]+/g, '_')}.pdf`;
  const api = window.electronAPI;
  if (api?.savePdf) {
    const res = await api.savePdf({ html, defaultFileName: fileName });
    if (res.canceled) return;
    if (!res.success) {
      toast.error(res.error || 'Could not save PDF');
      return;
    }
    toast.success('PDF saved');
    return;
  }
  const w = window.open('', '_blank');
  if (!w) {
    toast.error('Allow popups to print');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
