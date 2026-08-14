import type { PosReceipt } from './checkout';

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

export type PrintDocType = 'receipt' | 'debtor_note' | 'statement' | 'delivery_note';

/** Printable receipt body — only this block is shown when printing (see index.css). */
export function ReceiptDocument({ receipt, docType = 'receipt' }: { receipt: PosReceipt, docType?: PrintDocType }) {
  const extrasTotal = receipt.extraCharges.reduce((s, c) => s + c.amount, 0);
  const showPrices = docType !== 'delivery_note';

  const docTitle = {
    receipt: receipt.mode === 'sales' ? 'Sales Receipt' : 'Goods Receipt',
    debtor_note: 'Debtor Note',
    statement: 'Statement',
    delivery_note: 'Delivery Note',
  }[docType];

  return (
    <div className="pos-receipt-sheet mx-auto w-full max-w-[300px] bg-white text-neutral-900 px-4 py-5 text-[13px] leading-snug shadow-sm">
      <header className="text-center pb-4 mb-4 border-b border-dashed border-neutral-300">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          {docTitle}
        </p>
        <p className="mt-2 font-mono text-[15px] font-semibold tracking-tight text-neutral-950">
          {receipt.ref}
        </p>
        <p className="mt-1.5 text-[11px] text-neutral-500">{fmtDate(receipt.createdAt)}</p>
        {!receipt.synced && (
          <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
            Local only — not synced
          </p>
        )}
      </header>

      <dl className="mb-4 space-y-2 text-[12px]">
        {receipt.storeName && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Store</dt>
            <dd className="text-right font-medium text-neutral-900">{receipt.storeName}</dd>
          </div>
        )}
        {receipt.partyLabel && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">
              {receipt.mode === 'sales' ? 'Customer' : 'Supplier'}
            </dt>
            <dd className="text-right font-medium text-neutral-900">{receipt.partyLabel}</dd>
          </div>
        )}
        {receipt.paymentMethod && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Payment</dt>
            <dd className="text-right font-semibold uppercase tracking-wide text-neutral-900">
              {receipt.paymentMethod}
            </dd>
          </div>
        )}
        {receipt.saleType && receipt.saleType !== 'normal' && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Sale Type</dt>
            <dd className="text-right font-medium capitalize text-neutral-900">
              {receipt.saleType}
            </dd>
          </div>
        )}
        {receipt.paymentTiming && receipt.paymentTiming !== 'cod' && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Payment Timing</dt>
            <dd className="text-right font-medium capitalize text-neutral-900">
              {receipt.paymentTiming.replace('_', ' ')}
            </dd>
          </div>
        )}
      </dl>

      <table className="mb-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-wider text-neutral-500">
            <th className="pb-2 text-left font-semibold">Item</th>
            <th className="pb-2 text-right font-semibold">Qty</th>
            {showPrices && <th className="pb-2 text-right font-semibold">Amt</th>}
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((l, i) => (
            <tr key={`${l.sku}-${i}`} className="border-b border-neutral-100 align-top">
              <td className="py-2.5 pr-2">
                <div className="font-medium text-neutral-900 leading-snug">{l.name}</div>
                <div className="mt-0.5 font-mono text-[10px] text-neutral-400">{l.sku}</div>
                {showPrices && (
                  <div className="mt-0.5 text-[10px] text-neutral-500">
                    {fmt(l.rate)}
                    {l.taxPct > 0 ? ` · ${l.taxPct}% tax` : ''}
                  </div>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums text-neutral-700">{l.qty}</td>
              {showPrices && (
                <td className="py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-neutral-900">
                  {fmt(l.lineTotal)}
                </td>
              )}
            </tr>
          ))}
          {showPrices && receipt.extraCharges.map((c, i) => (
            <tr key={`x-${i}`} className="border-b border-neutral-100">
              <td className="py-2 italic text-neutral-600" colSpan={2}>
                {c.label}
              </td>
              <td className="py-2 text-right font-semibold tabular-nums whitespace-nowrap">
                {c.amount < 0 ? '−' : ''}
                {fmt(Math.abs(c.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showPrices && (
        <div className="space-y-1.5 border-t border-dashed border-neutral-300 pt-3 text-[12px]">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmt(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Tax</span>
            <span className="tabular-nums">{fmt(receipt.taxAmount)}</span>
          </div>
          {extrasTotal !== 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Extras</span>
              <span className="tabular-nums">
                {extrasTotal < 0 ? '−' : ''}
                {fmt(Math.abs(extrasTotal))}
              </span>
            </div>
          )}
          <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
              Total
            </span>
            <span className="text-xl font-bold tabular-nums tracking-tight text-neutral-950">
              {fmt(receipt.totalAmount)}
            </span>
          </div>
        </div>
      )}

      {docType === 'debtor_note' && (
        <div className="mt-4 pt-3 border-t border-neutral-200 text-center text-[10px] text-neutral-600">
          This is a debtor note reflecting the outstanding balance for this transaction.
        </div>
      )}
      {docType === 'statement' && (
        <div className="mt-4 pt-3 border-t border-neutral-200 text-center text-[10px] text-neutral-600">
          This is an official statement of account for this transaction.
        </div>
      )}

      <p className="mt-5 text-center text-[11px] font-medium text-neutral-500">
        {docType === 'delivery_note' ? 'Please verify all items upon delivery' : 'Thank you for your business'}
      </p>
    </div>
  );
}
