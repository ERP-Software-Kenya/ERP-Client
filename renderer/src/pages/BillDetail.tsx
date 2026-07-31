import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ErrorState } from '../components/errors/ErrorState';
import { Button } from '../components/ui/button';
import { Bills, PaymentTransactions } from '../api';

function billAmountLabel(bill: { amount?: number; totalAmount?: number }): string {
  const amt = bill.amount ?? bill.totalAmount;
  return amt != null ? `$${Number(amt).toFixed(2)}` : '— (not on API response)';
}

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: bill, isLoading, error, refetch } = Bills.useGet(id);

  const {
    data: paymentsResult,
    isError: paymentsError,
    error: paymentsErr,
  } = PaymentTransactions.useSearch({ limit: 100 });
  const linkedPayments = paymentsError
    ? []
    : (paymentsResult?.items ?? []).filter(
        (p) => p.referenceType === 'bill' && p.referenceId === id,
      );

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (error || !bill) {
    return <ErrorState type="load" onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/bills')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Bills
      </button>

      <div>
        <h1 className="text-2xl font-semibold">
          Bill {bill.billNumber || bill.id.slice(0, 8)}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Status: {bill.status ?? '—'} · Amount: {billAmountLabel(bill)}
        </p>
        <p className="text-muted-foreground text-xs mt-1">ID: {bill.id}</p>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Payment create blocked — verified in core-apis: request lacks <code className="text-[10px]">@AutoMap</code>,
        and domain <code className="text-[10px]">orgId</code> does not map to entity{' '}
        <code className="text-[10px]">organizationId</code> (#0d). Listing linked payments still works when rows
        exist.
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Payments</h2>
          <Button size="sm" variant="outline" disabled title="Blocked by Core API #0d">
            Record Payment (blocked)
          </Button>
        </div>
        {paymentsError ? (
          <p className="text-xs text-destructive">
            Unable to load payments
            {paymentsErr instanceof Error && paymentsErr.message ? ` (${paymentsErr.message})` : ''}.
          </p>
        ) : linkedPayments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No payments recorded for this bill.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {linkedPayments.map((p) => (
              <li key={p.id}>
                {p.method || 'payment'} — ${Number(p.amount || 0).toFixed(2)} ({p.status})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
