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

/** Printable delivery note with optional driver / vehicle block. */
export function DeliveryNoteDocument({ receipt }: { receipt: PosReceipt }) {
  const d = receipt.delivery;
  const hasDelivery = Boolean(
    d &&
      (d.driverName ||
        d.vehicleNumber ||
        d.location ||
        d.companionName ||
        d.note),
  );

  return (
    <div className="pos-receipt-sheet mx-auto w-full max-w-[320px] bg-white text-neutral-900 px-4 py-5 text-[13px] leading-snug shadow-sm">
      <header className="text-center pb-4 mb-4 border-b border-dashed border-neutral-300">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Delivery Note
        </p>
        <p className="mt-2 font-mono text-[15px] font-semibold tracking-tight text-neutral-950">
          {receipt.ref}
        </p>
        <p className="mt-1.5 text-[11px] text-neutral-500">{fmtDate(receipt.createdAt)}</p>
      </header>

      <dl className="mb-4 space-y-2 text-[12px]">
        {receipt.storeName && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-neutral-500">From</dt>
            <dd className="text-right font-medium">{receipt.storeName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="shrink-0 text-neutral-500">Customer</dt>
          <dd className="text-right font-medium">{receipt.partyLabel || '—'}</dd>
        </div>
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
              <td className="py-2 pr-2">
                <div className="font-medium">{l.name}</div>
                <div className="font-mono text-[10px] text-neutral-400">{l.sku}</div>
              </td>
              <td className="py-2 text-right tabular-nums">{l.qty}</td>
              <td className="py-2 text-right font-semibold tabular-nums">
                {fmt(l.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasDelivery && d && (
        <div className="mb-4 rounded-lg border border-neutral-200 p-3 space-y-1.5 text-[12px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Delivery
          </p>
          {d.driverName && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Driver</span>
              <span className="font-medium text-right">{d.driverName}</span>
            </div>
          )}
          {d.companionName && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">With driver</span>
              <span className="font-medium text-right">{d.companionName}</span>
            </div>
          )}
          {d.vehicleNumber && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Vehicle</span>
              <span className="font-medium text-right">{d.vehicleNumber}</span>
            </div>
          )}
          {d.license && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">License</span>
              <span className="font-medium text-right">{d.license}</span>
            </div>
          )}
          {d.location && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Location</span>
              <span className="font-medium text-right">{d.location}</span>
            </div>
          )}
          {d.distance && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Distance</span>
              <span className="font-medium text-right">{d.distance}</span>
            </div>
          )}
          {d.gps && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">GPS</span>
              <span className="font-medium text-right">{d.gps}</span>
            </div>
          )}
          {d.rating && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Rating</span>
              <span className="font-medium text-right">{d.rating}</span>
            </div>
          )}
          {d.note && (
            <p className="pt-1 text-neutral-600 border-t border-neutral-100 mt-2">
              {d.note}
            </p>
          )}
        </div>
      )}

      <div className="flex items-baseline justify-between border-t border-dashed border-neutral-300 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
          Total
        </span>
        <span className="text-xl font-bold tabular-nums">{fmt(receipt.totalAmount)}</span>
      </div>
    </div>
  );
}
