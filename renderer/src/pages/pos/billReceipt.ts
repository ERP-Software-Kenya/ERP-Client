import { toast } from 'sonner';
import { formatEntityLabel } from '../../lib/entityLabel';
import type { Bill } from '../../types';
import type { PosReceipt } from './checkout';
import { buildSaleDocHtml, defaultPdfFileName, type SaleDocKind } from './buildSaleDocHtml';

export function billToPosReceipt(
  bill: Bill,
  opts: {
    locationName?: string;
    partyLabel?: string;
    productLabel?: (productId: string) => string;
  } = {},
): PosReceipt {
  const items = bill.items ?? [];
  return {
    ref: bill.billNumber || bill.id,
    mode: 'sales',
    storeName: opts.locationName,
    partyLabel: opts.partyLabel,
    paymentMethod: bill.paymentMethod ?? undefined,
    saleType: bill.saleType ?? undefined,
    paymentTiming: bill.paymentTiming ?? undefined,
    lines: items.map((item) => ({
      sku: formatEntityLabel({ id: item.productId }),
      name: opts.productLabel?.(item.productId) ?? formatEntityLabel({ id: item.productId }),
      qty: Number(item.quantity),
      rate: Number(item.unitPrice),
      taxPct: Number(item.taxRate),
      lineTotal: Number(item.lineTotal),
    })),
    extraCharges: [],
    subtotal: Number(bill.subtotal ?? 0),
    taxAmount: Number(bill.taxAmount ?? 0),
    totalAmount: Number(bill.totalAmount ?? 0),
    createdAt: bill.billedAt || bill.createdAt || new Date().toISOString(),
    synced: true,
  };
}

export function printSaleDoc(receipt: PosReceipt, kind: SaleDocKind = 'receipt'): void {
  const html = buildSaleDocHtml(receipt, kind);
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

export async function downloadSaleDoc(
  receipt: PosReceipt,
  kind: SaleDocKind = 'receipt',
): Promise<void> {
  const html = buildSaleDocHtml(receipt, kind);
  const api = window.electronAPI;
  if (api?.savePdf) {
    const res = await api.savePdf({
      html,
      defaultFileName: defaultPdfFileName(receipt, kind),
    });
    if (res.canceled) return;
    if (!res.success) {
      toast.error(res.error || 'Could not save PDF');
      return;
    }
    toast.success('PDF saved');
    return;
  }

  const safe = receipt.ref.replace(/[^\w.-]+/g, '_');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  a.download = `${kind}-${safe}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}
