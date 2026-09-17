import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectItem {
  id: string;
  label: string;
  /** Optional secondary line — e.g. SKU shown below the name */
  sublabel?: string;
}

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Extra className applied to the wrapper div */
  className?: string;
}

/**
 * A text-searchable combobox that replaces a plain <Select> when the item list
 * is large.  Filters by both `label` and `sublabel` (name + SKU) as the user
 * types — matching the POS "SKU or product name…" pattern.
 */
export function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder = 'Search…',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = items.find((it) => it.id === value);

  // Reset query whenever selection changes externally
  useEffect(() => {
    if (!open) setQuery('');
  }, [value, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = query.trim()
    ? items.filter((it) => {
        const q = query.toLowerCase();
        return (
          it.label.toLowerCase().includes(q) ||
          (it.sublabel?.toLowerCase().includes(q) ?? false)
        );
      })
    : items;

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setActiveIdx(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (id: string) => {
    onValueChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) {
        handleSelect(filtered[activeIdx].id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Trigger button (shown when closed) */}
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`
            flex h-9 w-full items-center justify-between rounded-md border border-input
            bg-background px-3 py-2 text-sm shadow-sm transition-colors
            hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0
            disabled:cursor-not-allowed disabled:opacity-50
          `}
        >
          <span className={selected ? 'truncate text-foreground' : 'text-muted-foreground'}>
            {selected ? selected.label : placeholder}
          </span>
          <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                className="rounded-sm p-0.5 hover:text-foreground"
              >
                <X size={12} />
              </span>
            )}
            <ChevronDown size={14} />
          </div>
        </button>
      )}

      {/* Open state: search input + dropdown */}
      {open && (
        <div className="flex flex-col rounded-md border border-input bg-background shadow-lg ring-1 ring-ring/20">
          {/* Search input */}
          <div className="relative border-b border-border">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="SKU or product name…"
              className="h-9 w-full bg-transparent py-2 pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No results found.</p>
            ) : (
              filtered.map((it, idx) => (
                <button
                  key={it.id}
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => handleSelect(it.id)}
                  className={`
                    flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors
                    ${idx === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'}
                    ${it.id === value ? 'font-medium' : ''}
                  `}
                >
                  <span className="truncate leading-tight">{it.label}</span>
                  {it.sublabel && (
                    <span className="font-mono text-[10px] text-muted-foreground">{it.sublabel}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
