import { useState, useEffect } from 'react';
import { RefreshCw, Search, Plus, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../hooks/useDebounce';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{title}</h2>
          {description && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="erp-input"
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem', width: '220px' }}
            />
          </div>
          <button className="btn btn-ghost btn-icon" onClick={() => void refetch()} title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin-slow' : ''} />
          </button>
          {onAdd && isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={onAdd}>
              <Plus size={15} /> Add
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: 'var(--surface-1)',
          borderRadius: '0.75rem',
          border: '1px solid var(--surface-2)',
        }}
      >
        {error && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
            <p>Failed to load: {error}</p>
            <button className="btn btn-ghost btn-sm" onClick={() => void refetch()} style={{ marginTop: '0.75rem' }}>
              Retry
            </button>
          </div>
        )}

        {!error && (
          <table className="erp-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} style={{ width: col.width }}>
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete) && isAdmin && <th style={{ width: '100px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={String(col.key)}>
                        <div className="skeleton" style={{ height: '16px', width: '80%' }} />
                      </td>
                    ))}
                    {(onEdit || onDelete) && isAdmin && (
                      <td><div className="skeleton" style={{ height: '16px', width: '60px' }} /></td>
                    )}
                  </tr>
                ))
              }

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No records found
                  </td>
                </tr>
              )}

              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={String(col.key)}>
                      {col.render
                        ? col.render(row)
                        : String(getCellValue(row, String(col.key)) ?? '—')}
                    </td>
                  ))}
                  {(onEdit || onDelete) && isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {onEdit && (
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => onEdit(row)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => onDelete(row)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>
          {total > 0
            ? `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`
            : 'No results'}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ minWidth: '4rem', textAlign: 'center' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
