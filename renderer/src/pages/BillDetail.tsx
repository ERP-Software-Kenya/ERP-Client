import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Bills as BillsApi, PaymentTransactions as PaymentTransactionsApi } from '../api';
import type { PaymentTransaction } from '../types';

interface PaymentFormState {
  method: string;
  amount: string;
}

const EMPTY_PAYMENT_FORM: PaymentFormState = { method: '', amount: '' };

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(EMPTY_PAYMENT_FORM);

  const { data: bill, isLoading, error } = useQuery({
    queryKey: ['bills', id],
    queryFn: () => BillsApi.getById(id!),
    enabled: !!id,
  });

  // Reads fine (search works), but will always come back empty — nothing can
  // create a payment today (see #0d below), so there's nothing to filter to.
  const { data: paymentsResult } = useQuery({
    queryKey: ['payment-transactions', 'for-bill', id],
    queryFn: () => PaymentTransactionsApi.search({ limit: 100 }),
    enabled: !!id,
  });
  const linkedPayments = (paymentsResult?.data ?? []).filter(
    (p) => p.referenceType === 'bill' && p.referenceId === id,
  );

  // Wired up and ready, but the submit button below stays disabled: POST
  // /payment-transactions 500s on every call — domain model uses `orgId`, the
  // entity's real NOT-NULL column is `organizationId`. See
  // docs/core-apis-fixes.md #0d. Remove the `disabled` prop once that's fixed.
  const createPaymentMutation = useMutation({
    mutationFn: (body: Partial<PaymentTransaction>) => PaymentTransactionsApi.create(body),
    onSuccess: () => {
      toast.success('Payment recorded');
      setPaymentDialogOpen(false);
      setPaymentForm(EMPTY_PAYMENT_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to record payment'),
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    createPaymentMutation.mutate({
      referenceId: id,
      referenceType: 'bill',
      type: 'payment',
      method: paymentForm.method || undefined,
      amount: paymentForm.amount ? Number(paymentForm.amount) : undefined,
    });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error || !bill) return <div className="p-6 text-red-500">Failed to load bill: {String(error)}</div>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/bills')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Bills
      </button>

      <div>
        <h1 className="text-2xl font-semibold">Bill {bill.billNumber || bill.id.slice(0, 8)}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Status: {bill.status ?? '—'} · Amount: ${Number(bill.amount || 0).toFixed(2)}
        </p>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Supplier and store aren't exposed by the API today, and there's no field linking this bill back
        to a Purchase Order (see docs/core-apis-fixes.md #0c).
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Payments</h2>
          <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
            Record Payment
          </Button>
        </div>
        {linkedPayments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No payments recorded. (Recording is currently blocked — see docs/core-apis-fixes.md #0d.)
          </p>
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

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Submitting is disabled — this endpoint currently fails server-side for every request.
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Method</Label>
              <Input
                id="pay-method"
                placeholder="e.g. cash, card, bank_transfer"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled>
                Record (blocked — see notice above)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
