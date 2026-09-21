import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Branches, useListBranchProductPrices } from '../../api';
import { useSession } from '../../context/SessionContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { SetBranchPriceDialog } from './SetBranchPriceDialog';
import type { Branch, ProductBranchPrice } from '../../types';

const PAGE_SIZE = 15;

function PriceCell({ val }: { val: number | null }): React.JSX.Element {
  if (val == null) return <span className="text-muted-foreground">—</span>;
  return <span>{Number(val).toFixed(2)}</span>;
}

function StatusBadge({ isSet }: { isSet: boolean }): React.JSX.Element {
  if (isSet) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        Set
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
      Not set
    </span>
  );
}

function isPriceSet(row: ProductBranchPrice): boolean {
  return (
    row.retailPrice != null ||
    row.costPrice != null ||
    row.loyaltyPrice != null ||
    row.wholesalePrice != null ||
    row.transferPrice != null
  );
}

export default function BranchPricingPage(): React.JSX.Element {
  const { isAdmin, branchId: sessionBranchId } = useSession();
  const { data: branchList } = Branches.useList();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [priceTarget, setPriceTarget] = useState<ProductBranchPrice | null>(null);

  // Org admin: use branch selector; branch manager: lock to session branch
  useEffect(() => {
    if (!isAdmin && sessionBranchId) {
      setSelectedBranchId(sessionBranchId);
    }
  }, [isAdmin, sessionBranchId]);

  // Default to first branch for admin when list loads
  useEffect(() => {
    if (isAdmin && !selectedBranchId && branchList && branchList.length > 0) {
      setSelectedBranchId(branchList[0].id);
    }
  }, [isAdmin, selectedBranchId, branchList]);

  // Reset page on search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedBranchId]);

  const { data, isLoading, error, refetch } = useListBranchProductPrices({
    branchId: selectedBranchId,
    page,
    search: debouncedSearch,
  });

  const selectedBranch = useMemo(
    (): Branch | undefined => (branchList ?? []).find((b) => b.id === selectedBranchId),
    [branchList, selectedBranchId],
  );

  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE));
  const items = data?.items ?? [];
  const setCount  = items.filter(isPriceSet).length;
  const notSetCount = items.length - setCount;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Branch Pricing</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage product prices per branch</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch selector — admin only */}
          {isAdmin ? (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="">Select branch…</option>
              {(branchList ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.isMain ? ' (MAIN)' : ''}
                </option>
              ))}
            </select>
          ) : (
            selectedBranch && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {selectedBranch.name}
              </span>
            )
          )}

          {/* Search */}
          <Input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[200px]"
          />

          <Button variant="ghost" size="icon" onClick={() => void refetch()} title="Refresh">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Status chips */}
      {selectedBranchId && data && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Total: {data.totalCount}</span>
          <span className="text-emerald-400">Set: {setCount}</span>
          <span className="text-amber-400">Not set: {notSetCount}</span>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
        {error && (
          <p className="p-6 text-center text-destructive">{String(error)}</p>
        )}
        {!selectedBranchId && !error && (
          <p className="p-8 text-center text-muted-foreground text-sm">Select a branch to view prices.</p>
        )}
        {selectedBranchId && !error && (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Retail</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Wholesale</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Loyalty</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Transfer</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="w-[80px] px-3 py-1.5 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && items.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-3 py-1.5">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              }
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    No products found
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  <td className="px-3 py-1.5 font-medium">{row.productName}</td>
                  <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">{row.sku ?? '—'}</td>
                  <td className="px-3 py-1.5"><PriceCell val={row.retailPrice} /></td>
                  <td className="px-3 py-1.5"><PriceCell val={row.wholesalePrice} /></td>
                  <td className="px-3 py-1.5"><PriceCell val={row.loyaltyPrice} /></td>
                  <td className="px-3 py-1.5"><PriceCell val={row.transferPrice} /></td>
                  <td className="px-3 py-1.5"><StatusBadge isSet={isPriceSet(row)} /></td>
                  <td className="px-3 py-1.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPriceTarget(row)}
                    >
                      {isPriceSet(row) ? 'Edit' : 'Set'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {selectedBranchId && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {(data?.totalCount ?? 0) > 0
              ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, data?.totalCount ?? 0)} of ${data?.totalCount ?? 0}`
              : 'No results'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              ‹
            </Button>
            <span className="min-w-[4rem] text-center">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              ›
            </Button>
          </div>
        </div>
      )}

      <SetBranchPriceDialog
        key={priceTarget?.id ?? 'none'}
        price={priceTarget}
        branchName={selectedBranch?.name ?? ''}
        onClose={() => setPriceTarget(null)}
      />
    </div>
  );
}
