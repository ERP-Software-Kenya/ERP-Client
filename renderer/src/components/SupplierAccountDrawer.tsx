import { useEffect, useState } from 'react';
import { X, TrendingDown, Wallet, ReceiptText, CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { RecordPaymentModal } from './RecordPaymentModal';
import { Suppliers } from '../api';
import { fmt } from '../pages/pos/posHelpers';
import type { SupplierAccountPo } from '../types';

interface SupplierAccountDrawerProps {
  supplierId: string | null;
  open: boolean;
  onClose: () => void;
}

const PAYMENT_STATUS_CONFIG: Record<
  'unpaid' | 'partial' | 'paid',
  { label: string; cls: string }
> = {
  unpaid: {
    label: 'Unpaid',
    cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  },
  partial: {
    label: 'Partial',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  paid: {
    label: 'Paid',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
};

function PaymentStatusBadge({ status }: { status: 'unpaid' | 'partial' | 'paid' }) {
  const cfg = PAYMENT_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

function fmtDate(d: string | undefined | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function SupplierAccountDrawer({
  supplierId,
  open,
  onClose,
}: SupplierAccountDrawerProps) {
  const [payingPo, setPayingPo] = useState<SupplierAccountPo | null>(null);

  const { data: account, isLoading, error, refetch } = Suppliers.useGetAccount(
    open && supplierId ? supplierId : undefined,
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !payingPo) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, payingPo]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
        <div className="relative z-10 flex flex-col bg-background shadow-xl w-full max-w-3xl overflow-y-auto">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
            <div>
              <p className="font-semibold text-sm text-foreground">
                {account ? account.supplierName : 'Supplier Account'}
              </p>
              {account?.supplierPhone && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {account.supplierPhone}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 px-5 py-4 space-y-5">
            {isLoading && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Loading account…
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-32 text-sm text-red-500">
                Failed to load supplier account.
              </div>
            )}

            {account && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                    <ReceiptText size={17} className="mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Invoiced</p>
                      <p className="mt-0.5 text-base font-semibold text-foreground font-mono">
                        {fmt(account.totalInvoiced)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                    <Wallet size={17} className="mt-0.5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="mt-0.5 text-base font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        {fmt(account.totalPaid)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                    <TrendingDown
                      size={17}
                      className={`mt-0.5 shrink-0 ${account.totalOutstanding > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
                    />
                    <div>
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                      <p
                        className={`mt-0.5 text-base font-semibold font-mono ${
                          account.totalOutstanding > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-foreground'
                        }`}
                      >
                        {fmt(account.totalOutstanding)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* PO table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <h2 className="font-semibold text-sm text-foreground">Purchase Orders</h2>
                  </div>

                  {account.purchaseOrders.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No purchase orders found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b border-border">
                          <tr>
                            <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                              PO Number
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                              Status
                            </th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                              Total
                            </th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                              Paid
                            </th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                              Outstanding
                            </th>
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                              Payment
                            </th>
                            <th className="px-5 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {account.purchaseOrders.map((po) => (
                            <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-foreground">
                                  {po.poNumber || po.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {fmtDate(po.createdAt)}
                                </p>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-xs text-muted-foreground capitalize">
                                  {po.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right tabular-nums text-foreground">
                                {fmt(po.totalAmount)}
                              </td>
                              <td className="px-4 py-3.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                                {fmt(po.amountPaid)}
                              </td>
                              <td className="px-4 py-3.5 text-right tabular-nums">
                                {po.outstanding > 0 ? (
                                  <span className="font-semibold text-red-600 dark:text-red-400">
                                    {fmt(po.outstanding)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <PaymentStatusBadge status={po.paymentStatus} />
                              </td>
                              <td className="px-5 py-3.5 text-center">
                                {po.paymentStatus !== 'paid' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    onClick={() => setPayingPo(po)}
                                  >
                                    <CreditCard size={11} className="mr-1" />
                                    Pay
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground/40">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment modal rendered outside the drawer so z-index stack is correct */}
      {payingPo && (
        <RecordPaymentModal
          open={!!payingPo}
          onClose={() => setPayingPo(null)}
          poId={payingPo.id}
          poNumber={payingPo.poNumber || payingPo.id.slice(0, 8).toUpperCase()}
          outstanding={payingPo.outstanding}
          onSuccess={() => {
            setPayingPo(null);
            void refetch();
          }}
        />
      )}
    </>
  );
}
