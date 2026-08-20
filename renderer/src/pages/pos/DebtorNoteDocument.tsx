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

/** Printable debtor note — credit amount owed for this sale. */
export function DebtorNoteDocument({ receipt }: { receipt: PosReceipt }) {
  return (
    <div className="pos-receipt-sheet mx-auto w-full max-w-[320px] bg-white text-neutral-900 px-4 py-5 text-[13px] leading-snug shadow-sm">
      <header className="text-center pb-4 mb-4 border-b border-dashed border-neutral-300">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Debtor Note
        </p>
        <p className="mt-2 font-mono text-[15px] font-semibold tracking-tight text-neutral-950">
          {receipt.ref}
        </p>
        <p className="mt-1.5 text-[11px] text-neutral-500">{fmtDate(receipt.createdAt)}</p>
      </header>

      <dl className="mb-4 space-y-2 text-[12px]">
        {receipt.storeName && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Store</dt>
            <dd className="text-right font-medium">{receipt.storeName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-neutral-500">Customer</dt>
          <dd className="text-right font-medium">{receipt.partyLabel || '—'}</dd>
        </div>
        {receipt.paymentTiming && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Timing</dt>
            <dd className="text-right font-medium capitalize">
              {receipt.paymentTiming.replace(/_/g, ' ')}
            </dd>
          </div>
        )}
      </dl>

      <table className="mb-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-wider text-neutral-500">
            <th className="pb-2 text-left font-semibold">Item</th>
            <th className="pb-2 text-right font-semibold">Qty</th>
            <th className="pb-2 text-right font-semibold">Amt</th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((l, i) => (
            <tr key={`${l.sku}-${i}`} className="border-b border-neutral-100">
              <td className="py-2 pr-2 font-medium">{l.name}</td>
              <td className="py-2 text-right tabular-nums">{l.qty}</td>
              <td className="py-2 text-right font-semibold tabular-nums">
                {fmt(l.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-neutral-300 pt-3 space-y-1.5 text-[12px]">
        <div className="flex justify-between text-neutral-500">
          <span>Subtotal</span>
          <span className="tabular-nums">{fmt(receipt.subtotal)}</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>Tax</span>
          <span className="tabular-nums">{fmt(receipt.taxAmount)}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
            Amount owed
          </span>
          <span className="text-xl font-bold tabular-nums">{fmt(receipt.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
