import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { get, post, put, del, type QueryParams } from './http';
import type { PaginatedResponse } from '../types';

interface SearchParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Optional domain filters forwarded as query params (e.g. type=warehouse). */
  filters?: Record<string, string>;
  /**
   * Some DTOs use @IsNumber() on $page/$perPage without @Type(() => Number).
   * Query strings then 400 — omit pagination and let the handler default.
   */
  omitPagination?: boolean;
  /** When false, the query does not run. Default true. */
  enabled?: boolean;
}

function toQuery(p?: SearchParams): QueryParams {
  return {
    ...(p?.omitPagination
      ? {}
      : {
          $page: p?.page ?? 1,
          $perPage: p?.limit ?? 15,
        }),
    ...(p?.search ? { name: p.search } : {}),
    ...(p?.filters ?? {}),
  };
}

interface SearchResult<T> {
  items: T[];
  total: number;
}

function normalisePaginated<T>(raw: PaginatedResponse<T> | T[]): SearchResult<T> {
  if (Array.isArray(raw)) return { items: raw, total: raw.length };
  return { items: raw.items ?? [], total: raw.totalCount ?? 0 };
}

/**
 * For backends that only expose POST / and GET /:id (no list/search/update/delete).
 * Prevents ResourceSelect / tables from calling missing /list endpoints.
 */
export function createCreateOnlyResource<T extends { id: string }>(basePath: string, queryKey: string, label: string) {
  return {
    useGet(id: string | undefined): UseQueryResult<T> {
      return useQuery({
        queryKey: [queryKey, id],
        queryFn: () => get<T>(`${basePath}/${id as string}`),
        enabled: !!id,
      });
    },

    useCreate() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (body: Partial<T>) => post<T>(basePath, body),
        onSuccess: () => {
          toast.success(`${label} created`);
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
        onError: (error: Error) => toast.error(error.message || `Failed to create ${label.toLowerCase()}`),
      });
    },
  };
}

export function createResource<T extends { id: string }>(basePath: string, queryKey: string, label: string) {
  return {
    /** Flat list, uses the /list endpoint (falls back to a large page of the paginated endpoint). */
    useList(enabled = true): UseQueryResult<T[]> {
      return useQuery({
        queryKey: [queryKey, 'list'],
        queryFn: async () => {
          try {
            const raw = await get<T[]>(`${basePath}/list`);
            return Array.isArray(raw) ? raw : [];
          } catch {
            const paged = await get<PaginatedResponse<T> | T[]>(basePath, { $perPage: 100 });
            return Array.isArray(paged) ? paged : (paged.items ?? []);
          }
        },
        staleTime: 5 * 60 * 1000,
        enabled,
      });
    },

    /** Paginated search — resolves to { items, total }. */
    useSearch(params?: SearchParams) {
      return useQuery({
        queryKey: [
          queryKey,
          'search',
          params?.page ?? 1,
          params?.limit ?? 15,
          params?.search ?? '',
          params?.filters ?? {},
          params?.omitPagination ?? false,
        ],
        queryFn: async () => normalisePaginated(await get<PaginatedResponse<T> | T[]>(basePath, toQuery(params))),
        enabled: params?.enabled !== false,
      });
    },

    /** Single record by id. Disabled while id is undefined (e.g. route param not yet resolved). */
    useGet(id: string | undefined): UseQueryResult<T> {
      return useQuery({
        queryKey: [queryKey, id],
        queryFn: () => get<T>(`${basePath}/${id as string}`),
        enabled: !!id,
      });
    },

    useCreate() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (body: Partial<T>) => post<T>(basePath, body),
        onSuccess: () => {
          toast.success(`${label} created`);
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
        onError: (error: Error) => toast.error(error.message || `Failed to create ${label.toLowerCase()}`),
      });
    },

    useUpdate() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: ({ id, body }: { id: string; body: Partial<T> }) => put<T>(`${basePath}/${id}`, body),
        onSuccess: () => {
          toast.success(`${label} updated`);
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
        onError: (error: Error) => toast.error(error.message || `Failed to update ${label.toLowerCase()}`),
      });
    },

    useDelete() {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => del(`${basePath}/${id}`),
        onSuccess: () => {
          toast.success(`${label} deleted`);
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
        onError: (error: Error) => toast.error(error.message || `Failed to delete ${label.toLowerCase()}`),
      });
    },
  };
}
