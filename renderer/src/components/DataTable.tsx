import { useState } from 'react';
import { RefreshCw, Search, Plus, Trash2, Pencil, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

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
  onSearchChange: (search: string) => void;
  onRefetch?: () => void;
  onAdd?: () => void;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  isAdmin?: boolean;
  searchPlaceholder?: string;
  limit?: number;
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
  onRefetch,
  onAdd,
  onView,
  onEdit,
  onDelete,
  isAdmin,
  searchPlaceholder = 'Search…',
  limit = 15,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex h-full flex-col gap-4">
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
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                onSearchChange(e.target.value);
              }}
              className="w-[220px] pl-9"
            />
          </div>
          {onRefetch && (
            <Button variant="ghost" size="icon" onClick={onRefetch} title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          )}
          {onAdd && isAdmin && (
            <Button size="sm" onClick={onAdd}>
              <Plus size={15} /> Add
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
        {error && (
          <div className="p-8 text-center text-destructive">
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
                      {col.render ? col.render(row) : String(getCellValue(row, String(col.key)) ?? '—')}
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

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total > 0 ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : 'No results'}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
            <ChevronLeft size={15} />
          </Button>
          <span className="min-w-[4rem] text-center">{page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
