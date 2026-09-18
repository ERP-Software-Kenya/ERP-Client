import { ShoppingCart, CheckCircle2, Loader2, Package, User, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import type { Quotation } from '../../types';

interface ConvertQuotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
  onConfirm: () => void;
  isConverting?: boolean;
}

export default function ConvertQuotationModal({
  open,
  onOpenChange,
  quotation,
  onConfirm,
  isConverting = false,
}: ConvertQuotationModalProps) {
  if (!quotation) return null;

  const totalItemsCount = quotation.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0;
  const lineItemsCount = quotation.items?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !isConverting && onOpenChange(val)}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShoppingCart size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Convert to Sales Order
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Turn quotation <span className="font-semibold text-foreground">{quotation.quoteNumber}</span> into a confirmed order
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Quotation Summary Card */}
        <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User size={14} />
              <span>Customer</span>
            </div>
            <span className="font-semibold text-foreground truncate max-w-[200px]">
              {quotation.customer?.name ?? 'Walk-in Customer'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin size={14} />
              <span>Branch / Location</span>
            </div>
            <span className="font-medium text-foreground truncate max-w-[200px]">
              {quotation.location?.name ?? 'Main Location'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package size={14} />
              <span>Items Summary</span>
            </div>
            <span className="font-medium text-foreground">
              {lineItemsCount} line{lineItemsCount === 1 ? '' : 's'} ({totalItemsCount} unit{totalItemsCount === 1 ? '' : 's'})
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="font-bold text-foreground">Grand Total (Tax-Inc.)</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{Number(quotation.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Notice Info */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div className="space-y-0.5">
            <p className="font-semibold">Ready for Fulfillment</p>
            <p className="text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
              This will assign a new Sales Order number, mark this quotation as <strong>CONVERTED</strong>, and route items to warehouse dispatch.
            </p>
          </div>
        </div>

        {/* Dialog Actions */}
        <DialogFooter className="mt-4 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isConverting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isConverting}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isConverting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Converting...</span>
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                <span>Confirm Conversion</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
