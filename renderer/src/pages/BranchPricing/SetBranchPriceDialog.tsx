import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useUpsertBranchProductPrice } from '../../api';
import type { ProductBranchPrice } from '../../types';

interface Props {
  price: ProductBranchPrice | null;
  branchName: string;
  onClose: () => void;
}

interface FormState {
  retailPrice: string;
  costPrice: string;
  loyaltyPrice: string;
  wholesalePrice: string;
  transferPrice: string;
}

function toFieldValue(val: number | null | undefined): string {
  if (val == null) return '';
  return String(val);
}

function parseNullableNumber(val: string): number | null {
  if (val.trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export function SetBranchPriceDialog({ price, branchName, onClose }: Props): React.JSX.Element {
  const mutation = useUpsertBranchProductPrice();

  const [form, setForm] = useState<FormState>({
    retailPrice:    toFieldValue(price?.retailPrice),
    costPrice:      toFieldValue(price?.costPrice),
    loyaltyPrice:   toFieldValue(price?.loyaltyPrice),
    wholesalePrice: toFieldValue(price?.wholesalePrice),
    transferPrice:  toFieldValue(price?.transferPrice),
  });

  function handleChange(field: keyof FormState, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!price) return;
    mutation.mutate(
      {
        branchId:  price.branchId,
        productId: price.productId,
        body: {
          retailPrice:    parseNullableNumber(form.retailPrice),
          costPrice:      parseNullableNumber(form.costPrice),
          loyaltyPrice:   parseNullableNumber(form.loyaltyPrice),
          wholesalePrice: parseNullableNumber(form.wholesalePrice),
          transferPrice:  parseNullableNumber(form.transferPrice),
        },
      },
      { onSuccess: onClose },
    );
  }

  const fields: Array<{ key: keyof FormState; label: string }> = [
    { key: 'retailPrice',    label: 'Retail Price'    },
    { key: 'costPrice',      label: 'Cost Price'      },
    { key: 'loyaltyPrice',   label: 'Loyalty Price'   },
    { key: 'wholesalePrice', label: 'Wholesale Price' },
    { key: 'transferPrice',  label: 'Transfer Price'  },
  ];

  return (
    <Dialog open={price != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-emerald-500/15 p-1.5">
              <DollarSign size={15} className="text-emerald-400" />
            </div>
            <DialogTitle>
              Set Prices — {price?.productName} · {branchName}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-xs font-medium text-muted-foreground">
                  {label}
                </Label>
                <div className="flex items-center gap-1.5">
                  <span className="min-w-[28px] text-xs text-muted-foreground">KSh</span>
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="h-8 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save Prices'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
