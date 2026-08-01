import { useState } from 'react';
import { RefreshCw, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { RowActionsMenu, type ExtraAction } from './RowActionsMenu';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends { id: string }> {
  title: string;
  description?: string;
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  loading: boolean;
  error?: string | null;
  onPageChange: (page: number) => void;
  onSearchChange?: (search: string) => void;
  hideSearch?: boolean;
  toolbar?: React.ReactNode;
  onRefetch?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  /** When set, Delete menu item is shown only if this returns true for the row. */
  canDelete?: (row: T) => boolean;
  /** Per-row extra actions injected into the 3-dot menu before Delete. */
  extraRowActions?: (row: T) => ExtraAction[];
  isAdmin?: boolean;
  searchPlaceholder?: string;
  limit?: number;
  /** Optional muted note under the pager (e.g. omitPagination honesty). */
  footerNote?: string;
}

function getCellValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function DataTable<T extends { id: string }>({
  title,
  description,
  columns,
  rows,
  total,
  page,
  loading,
  error,
  onPageChange,
  onSearchChange,
  hideSearch,
  toolbar,
  onRefetch,
  onAdd,
  addLabel = 'Add',
  onView,
  onEdit,
  onDelete,
  canDelete,
  extraRowActions,
  isAdmin,
  searchPlaceholder = 'Search…',
  limit = 15,
  footerNote,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showAdminActions = Boolean(isAdmin && (onEdit || onDelete || extraRowActions));
  const showActions = Boolean(onView || showAdminActions);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar && (
            <>
              <span className="text-xs font-medium text-muted-foreground">Filters:</span>
              {toolbar}
              <div className="h-5 w-px bg-border" />
            </>
          )}
          {!hideSearch && (
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                className="w-[220px] pl-9"
              />
            </div>
          )}
          {onRefetch && (
            <Button variant="ghost" size="icon" onClick={onRefetch} title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          )}
          {onAdd && isAdmin && (
            <Button size="sm" onClick={onAdd}>
              <Plus size={15} /> {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border bg-card custom-scrollbar">
        {error && (
          <div className="p-6 text-center text-destructive">
            <p>Failed to load: {error}</p>
            {onRefetch && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={onRefetch}>
                Retry
              </Button>
            )}
          </div>
        )}

        {!error && (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} className="px-3 py-1.5 text-left font-medium text-muted-foreground" style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                {showActions && <th className="w-[60px] px-3 py-1.5 text-right font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && rows.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-3 py-1.5">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-3 py-1.5"><div className="ml-auto h-4 w-7 animate-pulse rounded bg-muted" /></td>
                    )}
                  </tr>
                ))
              }

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (showActions ? 1 : 0)} className="px-3 py-8 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-3 py-1.5">
                      {col.render ? col.render(row) : String(getCellValue(row, String(col.key)) ?? '—')}
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-3 py-1.5 text-right">
                      <RowActionsMenu
                        onView={onView ? () => onView(row) : undefined}
                        onEdit={showAdminActions && onEdit ? () => onEdit(row) : undefined}
                        extraActions={showAdminActions && extraRowActions ? extraRowActions(row) : undefined}
                        onDelete={
                          showAdminActions &&
                          onDelete &&
                          (canDelete ? canDelete(row) : true)
                            ? () => onDelete(row)
                            : undefined
                        }
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total > 0
              ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
              : 'No results'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft size={15} />
            </Button>
            <span className="min-w-[4rem] text-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
        {footerNote ? <p className="text-xs text-muted-foreground">{footerNote}</p> : null}
      </div>
    </div>
  );
}
