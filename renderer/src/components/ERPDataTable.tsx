import { useState, useEffect } from 'react';
import { RefreshCw, Search, Plus, Trash2, Pencil, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface Props<T extends { id: string }> {
  title: string;
  description?: string;
  columns: Column<T>[];
  fetchData(params?: { page?: number; limit?: number; search?: string }): Promise<unknown>;
  queryKey: string;
  onAdd?: () => void;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  isAdmin?: boolean;
  searchPlaceholder?: string;
}

function getCellValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function ERPDataTable<T extends { id: string }>({
  title,
  description,
  columns,
  fetchData,
  queryKey,
  onAdd,
  onView,
  onEdit,
  onDelete,
  isAdmin,
  searchPlaceholder = 'Search…',
}: Props<T>) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const limit = 15;

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const { data: queryData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [queryKey, page, limit, debouncedSearch],
    queryFn: async () => {
      const result = await fetchData({ page, limit, search: debouncedSearch || undefined });
      if (Array.isArray(result)) {
        return { rows: result as T[], total: result.length };
      }
      const r = result as { data?: T[]; total?: number; items?: T[] };
      const items = r.data ?? r.items ?? [];
      return { rows: items as T[], total: r.total ?? items.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  const rows = queryData?.rows ?? [];
  const total = queryData?.total ?? 0;
  const error = queryError ? String(queryError) : null;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[220px] pl-9"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => void refetch()} title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
          {onAdd && isAdmin && (
            <Button size="sm" onClick={onAdd}>
              <Plus size={15} /> Add
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
        {error && (
          <div className="p-8 text-center text-destructive">
            <p>Failed to load: {error}</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}

        {!error && (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} className="px-4 py-2 text-left font-medium text-muted-foreground" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                {(onView || onEdit || onDelete) && isAdmin && <th className="w-[130px] px-4 py-2 text-left font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && rows.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-4 py-2">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                    {(onView || onEdit || onDelete) && isAdmin && (
                      <td className="px-4 py-2"><div className="h-4 w-[60px] animate-pulse rounded bg-muted" /></td>
                    )}
                  </tr>
                ))
              }

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-2">
                      {col.render
                        ? col.render(row)
                        : String(getCellValue(row, String(col.key)) ?? '—')}
                    </td>
                  ))}
                  {(onView || onEdit || onDelete) && isAdmin && (
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {onView && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(row)} title="View">
                            <Eye size={14} />
                          </Button>
                        )}
                        {onEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)} title="Edit">
                            <Pencil size={14} />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn('h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive')}
                            onClick={() => onDelete(row)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total > 0
            ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
            : 'No results'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ChevronLeft size={15} />
          </Button>
          <span className="min-w-[4rem] text-center">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
