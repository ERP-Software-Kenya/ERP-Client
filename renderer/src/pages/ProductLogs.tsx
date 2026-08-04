import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { FormSection, Field } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Products, get } from '../api';
import { formatEntityLabel } from '../lib/entityLabel';
import { useAutoSelectFirst } from '../hooks/useAutoSelectFirst';
import type { ProductLog, PaginatedResponse, Product } from '../types';

export default function ProductLogsPage() {
  const [filterAction, setFilterAction] = useState('');
  const [filterProductId, setFilterProductId] = useState('');

  const { data: products } = Products.useList();

  useAutoSelectFirst(products, (p: Product) => setFilterProductId(p.id));

  const productLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    return m;
  }, [products]);

  const allProductQueries = useQueries({
    queries: (products ?? []).map((p) => ({
      queryKey: ['product-logs', 'by-product', p.id] as const,
      queryFn: async () => {
        const paged = await get<PaginatedResponse<ProductLog>>(`/api/v1/product-logs/by-product/${p.id}`, { perPage: 100 });
        return paged.items ?? [];
      },
      staleTime: 60_000,
    })),
  });

  const allLogsLoading = allProductQueries.some((q) => q.isLoading);

  const rawLogs = useMemo(
    () => allProductQueries.flatMap((q) => q.data ?? []),
    [allProductQueries],
  );

  const allLogs = useMemo(() => {
    let logs = rawLogs;
    if (filterAction) logs = logs.filter((l) => l.action === filterAction);
    if (filterProductId) logs = logs.filter((l) => l.productId === filterProductId);

    return [...logs].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [rawLogs, filterAction, filterProductId]);

  const uniqueActions = useMemo(() => {
    const actions = new Set<string>();
    for (const l of rawLogs) if (l.action) actions.add(l.action);
    return Array.from(actions).sort();
  }, [rawLogs]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Product logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit trail of all product changes and inventory movements.
        </p>
      </div>

      <FormSection title="Filters">
        <div className="flex flex-wrap gap-4 mb-4">
          <Field label="Action">
            <Select value={filterAction || "all"} onValueChange={(v) => setFilterAction(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Product">
            <div className="w-64">
              <ResourceSelect
                resource={Products}
                getLabel={(p) => formatEntityLabel({ name: p.name, sku: p.sku, id: p.id })}
                value={filterProductId}
                onValueChange={setFilterProductId}
                placeholder="All products"
                allowNone
                noneLabel="All products"
              />
            </div>
          </Field>
        </div>
        
        {allLogsLoading ? (
          <p className="text-sm text-muted-foreground">Loading all product logs…</p>
        ) : allLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs found matching criteria.</p>
        ) : (
          <LogTable rows={allLogs} productLabel={productLabel} />
        )}
      </FormSection>
    </div>
  );
}

function LogTable({
  rows,
  productLabel,
}: {
  rows: ProductLog[];
  productLabel: Map<string, string>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-4">Product</th>
            <th className="py-2 pr-4">Action</th>
            <th className="py-2 pr-4">Fields</th>
            <th className="py-2 pr-4">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => (
            <tr key={log.id} className="border-b border-border/60">
              <td className="py-2 pr-4">
                {productLabel.get(log.productId) ?? formatEntityLabel({ id: log.productId })}
              </td>
              <td className="py-2 pr-4">{log.action}</td>
              <td className="py-2 pr-4">
                {log.changedFields?.length ? log.changedFields.map((c) => c.field).join(', ') : '—'}
              </td>
              <td className="py-2 pr-4">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
