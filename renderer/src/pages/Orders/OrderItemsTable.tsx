import { Minus, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';

export interface OrderLineItem {
  id: number;
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
}

interface OrderItemsTableProps {
  items: OrderLineItem[];
  onQtyChange: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
}

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OrderItemsTable({ items, onQtyChange, onRemove }: OrderItemsTableProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground/50">
        <ShoppingCart size={40} strokeWidth={1.2} />
        <p className="text-sm font-medium text-muted-foreground">Search a product on the left to add it</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-muted">
          <tr>
            {['#', 'Product', 'Qty', 'Unit Price', 'Total', ''].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-muted/60 group">
              <td className="px-3 py-3 text-xs text-muted-foreground">{idx + 1}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Package size={13} className="text-muted-foreground" />
                  </div>
                  <span className="font-medium text-foreground">{item.name}</span>
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onQtyChange(item.id, Math.max(1, item.qty - 1))}
                    className="rounded p-1 text-muted-foreground transition hover:bg-muted"
                  >
                    <Minus size={11} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.qty}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) onQtyChange(item.id, v);
                    }}
                    className="w-14 rounded border border-border px-1 py-0.5 text-center text-sm font-semibold text-foreground tabular-nums outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => onQtyChange(item.id, item.qty + 1)}
                    className="rounded p-1 text-muted-foreground transition hover:bg-muted"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </td>
              <td className="px-3 py-3 tabular-nums text-foreground">{fmt(item.unitPrice)}</td>
              <td className="px-3 py-3 font-semibold tabular-nums text-foreground">{fmt(item.qty * item.unitPrice)}</td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="rounded p-1.5 text-muted-foreground/50 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
