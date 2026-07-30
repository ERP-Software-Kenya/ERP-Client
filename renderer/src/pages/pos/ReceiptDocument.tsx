import type { PosReceipt } from './checkout';

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Printable receipt body — only this block is shown when printing (see index.css). */
export function ReceiptDocument({ receipt }: { receipt: PosReceipt }) {
  const extrasTotal = receipt.extraCharges.reduce((s, c) => s + c.amount, 0);
  return (
    <div className="pos-receipt-sheet mx-auto w-full max-w-[320px] bg-white text-slate-900 text-sm">
      <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          {receipt.mode === 'sales' ? 'Sales receipt' : 'Goods receipt'}
        </p>
        <p className="font-mono font-semibold text-base mt-1">{receipt.ref}</p>
        <p className="text-xs text-slate-500 mt-1">{fmtDate(receipt.createdAt)}</p>
        {!receipt.synced && (
          <p className="text-[10px] text-amber-700 mt-1 font-medium">Local only — not synced to server</p>
        )}
      </div>

      <div className="space-y-1 text-xs mb-3">
        {receipt.storeName && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Store</span>
            <span className="font-medium text-right">{receipt.storeName}</span>
          </div>
        )}
        {receipt.partyLabel && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">{receipt.mode === 'sales' ? 'Customer' : 'Supplier'}</span>
            <span className="font-medium text-right">{receipt.partyLabel}</span>
          </div>
        )}
        {receipt.paymentMethod && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Payment</span>
            <span className="font-medium uppercase">{receipt.paymentMethod}</span>
          </div>
        )}
      </div>

      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="text-left py-1 font-medium">Item</th>
            <th className="text-right py-1 font-medium">Qty</th>
            <th className="text-right py-1 font-medium">Amt</th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((l, i) => (
            <tr key={`${l.sku}-${i}`} className="border-b border-slate-100 align-top">
              <td className="py-1.5 pr-2">
                <div className="font-medium leading-tight">{l.name}</div>
                <div className="font-mono text-[10px] text-slate-400">{l.sku}</div>
                <div className="text-[10px] text-slate-400">
                  {fmt(l.rate)}
                  {l.taxPct > 0 ? ` + ${l.taxPct}% tax` : ''}
                </div>
              </td>
              <td className="py-1.5 text-right">{l.qty}</td>
              <td className="py-1.5 text-right font-medium whitespace-nowrap">{fmt(l.lineTotal)}</td>
            </tr>
          ))}
          {receipt.extraCharges.map((c, i) => (
            <tr key={`x-${i}`} className="border-b border-slate-100">
              <td className="py-1.5 italic text-slate-600" colSpan={2}>
                {c.label}
              </td>
              <td className="py-1.5 text-right font-medium whitespace-nowrap">
                {c.amount < 0 ? '-' : ''}
                {fmt(Math.abs(c.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 text-xs border-t border-dashed border-slate-300 pt-3">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span>{fmt(receipt.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Tax</span>
          <span>{fmt(receipt.taxAmount)}</span>
        </div>
        {extrasTotal !== 0 && (
          <div className="flex justify-between text-slate-500">
            <span>Extras</span>
            <span>
              {extrasTotal < 0 ? '-' : ''}
              {fmt(Math.abs(extrasTotal))}
            </span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-2">
          <span>Total</span>
          <span>{fmt(receipt.totalAmount)}</span>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-4">Thank you</p>
    </div>
  );
}
