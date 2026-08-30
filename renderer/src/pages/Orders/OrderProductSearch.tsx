import { useRef, useState } from 'react';
import { Package, Scan, X } from 'lucide-react';
import type { Product } from '../../types';
import { Products } from '../../api';
import { useDebounce } from '../../hooks/useDebounce';

interface OrderProductSearchProps {
  onAddProduct: (p: Product) => void;
}

export function OrderProductSearch({ onAddProduct }: OrderProductSearchProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchVal, setSearchVal] = useState('');
  const debouncedSearch = useDebounce(searchVal, 250);

  const { data: productSearch } = Products.useSearch({
    page: 1,
    limit: 20,
    search: debouncedSearch.trim() || undefined,
  });

  const suggestions = productSearch?.items ?? [];

  const handleSelect = (p: Product) => {
    onAddProduct(p);
    setSearchVal('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Add Product</p>
        <div className="relative">
          <Scan size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SKU or product name…"
            className="w-full rounded-lg border border-border py-2 pl-8 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => setSearchVal('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="relative z-10 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition last:border-0 hover:bg-primary/10"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Package size={13} className="text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{p.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{p.sku ?? p.id.slice(0, 8)}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-primary">
                    ${Number(p.retailPrice ?? 0).toFixed(2)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
