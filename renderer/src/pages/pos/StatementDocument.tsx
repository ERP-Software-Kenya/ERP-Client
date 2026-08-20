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

/** Printable customer statement for this sale context. */
export function StatementDocument({ receipt }: { receipt: PosReceipt }) {
  const prev = Number(receipt.creditBalance ?? 0);
  const sale = receipt.totalAmount;
  const next = prev + sale;

  return (
    <div className="pos-receipt-sheet mx-auto w-full max-w-[320px] bg-white text-neutral-900 px-4 py-5 text-[13px] leading-snug shadow-sm">
      <header className="text-center pb-4 mb-4 border-b border-dashed border-neutral-300">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Statement
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
        {receipt.creditLimit != null && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">Credit limit</dt>
            <dd className="text-right font-medium tabular-nums">
              {fmt(Number(receipt.creditLimit))}
            </dd>
          </div>
        )}
      </dl>

      <div className="space-y-2 border border-neutral-200 rounded-lg p-3 text-[12px]">
        <div className="flex justify-between">
          <span className="text-neutral-500">Previous balance</span>
          <span className="tabular-nums font-medium">{fmt(prev)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">This sale</span>
          <span className="tabular-nums font-medium">{fmt(sale)}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-600">
            Balance
          </span>
          <span className="text-lg font-bold tabular-nums">{fmt(next)}</span>
        </div>
      </div>
    </div>
  );
}
