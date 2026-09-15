import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { PurchaseOrders } from '../api';
import { fmt } from '../pages/pos/posHelpers';

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  poId: string;
  poNumber: string;
  outstanding: number;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Online', label: 'Online' },
];

export function RecordPaymentModal({
  open,
  onClose,
  poId,
  poNumber,
  outstanding,
  onSuccess,
}: RecordPaymentModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paidAt, setPaidAt] = useState(today);
  const [note, setNote] = useState('');

  const mutation = PurchaseOrders.useRecordPayment();

  if (!open) return null;

  const parsedAmount = parseFloat(amount);
  const amountValid =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= outstanding;
  const canSubmit = amountValid && paymentMethod.length > 0 && !mutation.isPending;

  function handleClose() {
    setAmount('');
    setPaymentMethod('');
    setPaidAt(today);
    setNote('');
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate(
      {
        poId,
        body: {
          amount: parsedAmount,
          paymentMethod,
          paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
          note: note.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          onSuccess();
          handleClose();
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-background border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-sm text-foreground">Record Payment</p>
            <p className="text-xs text-muted-foreground mt-0.5">{poNumber}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Outstanding banner */}
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground flex items-center justify-between">
            <span>Outstanding balance</span>
            <span className="font-semibold font-mono text-foreground">{fmt(outstanding)}</span>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount" className="text-xs">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pay-amount"
              type="number"
              min="0.01"
              max={outstanding}
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono"
              required
            />
            {amount && !amountValid && (
              <p className="text-[11px] text-red-500">
                {parsedAmount > outstanding
                  ? `Cannot exceed outstanding (${fmt(outstanding)})`
                  : 'Enter a valid positive amount'}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-method" className="text-xs">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="pay-method">
                <SelectValue placeholder="Select method…" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-date" className="text-xs">
              Payment Date
            </Label>
            <Input
              id="pay-date"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-note" className="text-xs">
              Note (optional)
            </Label>
            <Textarea
              id="pay-note"
              rows={2}
              placeholder="Reference, cheque number, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none text-sm"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {mutation.isPending ? 'Saving…' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
