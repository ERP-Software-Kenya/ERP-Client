import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { FormSection, Field } from '../components/FormDrawer';
import { RecentRecords } from '../components/RecentRecords';
import { ResourceSelect } from '../components/ResourceSelect';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Products, Inventory, Locations, get, useProductLogsByProduct, useProductLogsByInventory, useProductLog } from '../api';
import { formatEntityLabel } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
import type { ProductLog } from '../types';

type Mode = 'product' | 'inventory' | 'log';

function productLogLabel(log: Pick<ProductLog, 'id' | 'action' | 'createdAt'>) {
  const action = log.action?.trim();
  const when = log.createdAt ? new Date(log.createdAt).toLocaleDateString() : undefined;
  if (action && when) return `${action} · ${when}`;
  if (action) return action;
  if (when) return when;
  return formatEntityLabel({ id: log.id });
}

export default function ProductLogsPage() {
  const recent = useRecentIds(RECENT_NS.productLogs);
  const [mode, setMode] = useState<Mode>('product');
  const [productId, setProductId] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [activeLogId, setActiveLogId] = useState<string | undefined>();

  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();
  const { data: inventoryList } = Inventory.useList();
  const productLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) {
      m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    }
    return m;
  }, [products]);
  const locationLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : formatEntityLabel({ name: l.name, id: l.id }));
    }
    return m;
  }, [locations]);
  const inventoryLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of inventoryList ?? []) {
      const prod = productLabel.get(i.productId) ?? formatEntityLabel({ id: i.productId });
      const loc = locationLabel.get(i.locationId) ?? formatEntityLabel({ id: i.locationId });
      m.set(i.id, `${prod} @ ${loc}`);
    }
    return m;
  }, [inventoryList, productLabel, locationLabel]);

  const inventoryRecordLabel = (invId: string, productIdForInv?: string, locationIdForInv?: string) => {
    const fromList = inventoryLabel.get(invId);
    if (fromList) return fromList;
    const prod = productIdForInv
      ? productLabel.get(productIdForInv) ?? formatEntityLabel({ id: productIdForInv })
      : undefined;
    const loc = locationIdForInv
      ? locationLabel.get(locationIdForInv) ?? formatEntityLabel({ id: locationIdForInv })
      : undefined;
    if (prod && loc) return `${prod} @ ${loc}`;
    if (prod) return prod;
    if (loc) return loc;
    return formatEntityLabel({ id: invId });
  };

  const { data: byProduct, isLoading: productLoading } = useProductLogsByProduct(
    mode === 'product' && productId ? productId : undefined,
  );
  const { data: byInventory, isLoading: inventoryLoading } = useProductLogsByInventory(
    mode === 'inventory' && inventoryId ? inventoryId : undefined,
  );
  const { data: singleLog, isLoading: logLoading } = useProductLog(
    mode === 'log' && activeLogId ? activeLogId : undefined,
  );

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['product-logs', e.id] as const,
      queryFn: () => get<ProductLog>(`/api/v1/product-logs/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(
    () =>
      recent.entries.map((e, i) => {
        const q = i < HYDRATE_LIMIT ? recentQueries[i] : undefined;
        const data = q?.data;
        return {
          id: e.id,
          label: e.label,
          savedAt: e.savedAt,
          action: data?.action,
          productId: data?.productId,
          createdAt: data?.createdAt,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = singleLog;
    if (!loaded || loaded.id !== activeLogId || mode !== 'log') return;
    recent.push(loaded.id, productLogLabel(loaded));
  }, [activeLogId, singleLog, recent.push, mode]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter a product log ID');
      return;
    }
    setMode('log');
    setActiveLogId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadLog = () => loadById(lookupId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Product logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit trail by product, inventory record, or individual log entry.
        </p>
      </div>

      <Field label="View mode">
        <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="product">By product</SelectItem>
            <SelectItem value="inventory">By inventory record</SelectItem>
            <SelectItem value="log">By log ID</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {mode === 'product' && (
        <FormSection title="Filter">
          <Field label="Product">
            <ResourceSelect
              resource={Products}
              getLabel={(p) => formatEntityLabel({ name: p.name, sku: p.sku, id: p.id })}
              value={productId}
              onValueChange={setProductId}
            />
          </Field>
          {!productId ? (
            <p className="text-sm text-muted-foreground">Select a product.</p>
          ) : productLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (byProduct?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No logs for this product.</p>
          ) : (
            <LogTable rows={byProduct!} productLabel={productLabel} onOpen={loadById} />
          )}
        </FormSection>
      )}

      {mode === 'inventory' && (
        <FormSection title="Filter">
          <Field label="Inventory record">
            <ResourceSelect
              resource={Inventory}
              getLabel={(i) => {
                const loc = locationLabel.get(i.locationId) ?? formatEntityLabel({ id: i.locationId });
                const prod = productLabel.get(i.productId) ?? formatEntityLabel({ id: i.productId });
                return `${prod} @ ${loc}`;
              }}
              value={inventoryId}
              onValueChange={setInventoryId}
            />
          </Field>
          {!inventoryId ? (
            <p className="text-sm text-muted-foreground">Select an inventory record.</p>
          ) : inventoryLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (byInventory?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No logs for this record.</p>
          ) : (
            <LogTable rows={byInventory!} productLabel={productLabel} onOpen={loadById} />
          )}
        </FormSection>
      )}

      {mode === 'log' && (
        <>
          <RecentRecords
            title="Recent product logs"
            emptyHint="No recent logs in this browser. Switch to By product / By inventory record and use Open, or use Advanced load by ID."
            rows={listRows}
            columns={[
              {
                key: 'action',
                header: 'Action',
                render: (r) => {
                  if (r.loading) return '…';
                  if (r.failed) return r.label?.trim() || 'unavailable';
                  return r.action || r.label || '—';
                },
              },
              {
                key: 'product',
                header: 'Product',
                render: (r) => {
                  if (r.loading) return '…';
                  if (r.failed) return 'unavailable';
                  return r.productId
                    ? productLabel.get(r.productId) ?? formatEntityLabel({ id: r.productId })
                    : '—';
                },
              },
              {
                key: 'when',
                header: 'When',
                render: (r) => {
                  if (r.loading) return '…';
                  if (r.failed) return 'unavailable';
                  return r.createdAt ? new Date(r.createdAt).toLocaleString() : '—';
                },
              },
              {
                key: 'saved',
                header: 'Saved',
                render: (r) => new Date(r.savedAt).toLocaleString(),
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => loadById(r.id)}>
                      Open
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(r.id)}>
                      Remove
                    </Button>
                  </div>
                ),
              },
            ]}
            rowKey={(r) => r.id}
            onClear={recent.clear}
          />

          <AdvancedIdLookup
            entityLabel="product log"
            value={lookupId}
            onChange={setLookupId}
            onLoad={loadLog}
          />

          <FormSection title="Log entry">
            {!activeLogId ? (
              <p className="text-sm text-muted-foreground">Pick a recent log or load one by ID.</p>
            ) : logLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !singleLog ? (
              <p className="text-sm text-destructive">Log not found.</p>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Action:</span> {singleLog.action}
                </p>
                <p>
                  <span className="text-muted-foreground">Product:</span>{' '}
                  {productLabel.get(singleLog.productId) ?? formatEntityLabel({ id: singleLog.productId })}
                </p>
                {singleLog.inventoryId && (
                  <p>
                    <span className="text-muted-foreground">Inventory:</span>{' '}
                    {inventoryRecordLabel(
                      singleLog.inventoryId,
                      singleLog.productId,
                      singleLog.locationId,
                    )}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">When:</span>{' '}
                  {singleLog.createdAt ? new Date(singleLog.createdAt).toLocaleString() : '—'}
                </p>
                {singleLog.changedFields?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="py-2 pr-4">Field</th>
                          <th className="py-2 pr-4">Old</th>
                          <th className="py-2">New</th>
                        </tr>
                      </thead>
                      <tbody>
                        {singleLog.changedFields.map((c, i) => (
                          <tr key={i} className="border-b border-border/60">
                            <td className="py-2 pr-4">{c.field}</td>
                            <td className="py-2 pr-4">{String(c.oldValue ?? '—')}</td>
                            <td className="py-2">{String(c.newValue ?? '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}
          </FormSection>
        </>
      )}
    </div>
  );
}

function LogTable({
  rows,
  productLabel,
  onOpen,
}: {
  rows: ProductLog[];
  productLabel: Map<string, string>;
  onOpen: (id: string) => void;
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
            <th className="py-2"></th>
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
              <td className="py-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onOpen(log.id)}>
                  Open
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
