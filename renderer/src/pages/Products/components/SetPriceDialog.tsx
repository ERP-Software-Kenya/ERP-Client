import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useUpdateProductPrice } from '../../../api';
import type { Product } from '../../../types';

interface Props {
  product: Product | null;
  onClose: () => void;
}

export function SetPriceDialog({ product, onClose }: Props) {
  const mutation = useUpdateProductPrice();

  const [form, setForm] = useState({
    costPrice:      String(product?.costPrice      ?? ''),
    retailPrice:    String(product?.retailPrice    ?? ''),
    loyaltyPrice:   String(product?.loyaltyPrice   ?? ''),
    wholesalePrice: String(product?.wholesalePrice ?? ''),
    transferPrice:  String(product?.transferPrice  ?? ''),
    reorderPoint:   String(product?.reorderPoint   ?? ''),
  });

  function parseOptionalNumber(val: string): number | undefined {
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }

  function handleChange(field: keyof typeof form, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!product) return;
    mutation.mutate(
      {
        id: product.id,
        body: {
          costPrice:      parseOptionalNumber(form.costPrice),
          retailPrice:    parseOptionalNumber(form.retailPrice),
          loyaltyPrice:   parseOptionalNumber(form.loyaltyPrice),
          wholesalePrice: parseOptionalNumber(form.wholesalePrice),
          transferPrice:  parseOptionalNumber(form.transferPrice),
          reorderPoint:   parseOptionalNumber(form.reorderPoint),
        },
      },
      { onSuccess: onClose },
    );
  }

  const fields: Array<{ key: keyof typeof form; label: string; prefix: string }> = [
    { key: 'retailPrice',    label: 'Retail Price',    prefix: 'KSh' },
    { key: 'costPrice',      label: 'Cost Price',      prefix: 'KSh' },
    { key: 'loyaltyPrice',   label: 'Loyalty Price',   prefix: 'KSh' },
    { key: 'wholesalePrice', label: 'Wholesale Price', prefix: 'KSh' },
    { key: 'transferPrice',  label: 'Transfer Price',  prefix: 'KSh' },
    { key: 'reorderPoint',   label: 'Reorder Point',   prefix: 'Qty' },
  ];

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-emerald-500/15 p-1.5">
              <DollarSign size={15} className="text-emerald-400" />
            </div>
            <DialogTitle>Set Prices — {product?.name}</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ key, label, prefix }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="text-xs font-medium text-muted-foreground">
                  {label}
                </Label>
                <div className="flex items-center gap-1.5">
                  <span className="min-w-[28px] text-xs text-muted-foreground">{prefix}</span>
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
