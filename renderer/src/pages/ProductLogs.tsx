import { useMemo, useState } from 'react';
import { FormSection, Field } from '../components/FormDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Products, Inventory, Locations, useProductLogsByProduct, useProductLogsByInventory, useProductLog } from '../api';

type Mode = 'product' | 'inventory' | 'log';

export default function ProductLogsPage() {
  const [mode, setMode] = useState<Mode>('product');
  const [productId, setProductId] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [logId, setLogId] = useState('');
  const [logLookupId, setLogLookupId] = useState('');

  const { data: locations } = Locations.useList();
  const storeLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : l.name);
    }
    return m;
  }, [locations]);

  const { data: byProduct, isLoading: productLoading } = useProductLogsByProduct(
    mode === 'product' && productId ? productId : undefined,
  );
  const { data: byInventory, isLoading: inventoryLoading } = useProductLogsByInventory(
    mode === 'inventory' && inventoryId ? inventoryId : undefined,
  );
  const { data: singleLog, isLoading: logLoading, refetch: refetchLog } = useProductLog(
    mode === 'log' && logLookupId ? logLookupId : undefined,
  );

  const loadLog = () => {
    setLogLookupId(logId.trim());
    void refetchLog();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Product logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">Audit trail by product, inventory record, or log ID.</p>
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
              getLabel={(p) => p.name || p.sku || p.id.slice(0, 8)}
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
            <LogTable rows={byProduct!} />
          )}
        </FormSection>
      )}

      {mode === 'inventory' && (
        <FormSection title="Filter">
          <Field label="Inventory record">
            <ResourceSelect
              resource={Inventory}
              getLabel={(i) => {
                const store = storeLabel.get(i.locationId) ?? i.locationId.slice(0, 8);
                return `${i.productId.slice(0, 8)} @ ${store}`;
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
            <LogTable rows={byInventory!} />
          )}
        </FormSection>
      )}

      {mode === 'log' && (
        <FormSection title="Look up log">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-md flex-1"
              placeholder="Log UUID"
              value={logId}
              onChange={(e) => setLogId(e.target.value)}
            />
            <Button type="button" onClick={loadLog}>
              Load
            </Button>
          </div>
          {!logLookupId ? (
            <p className="text-sm text-muted-foreground">Enter a log ID.</p>
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
                <span className="text-muted-foreground">Product:</span> {singleLog.productId.slice(0, 8)}…
              </p>
              {singleLog.inventoryId && (
                <p>
                  <span className="text-muted-foreground">Inventory:</span> {singleLog.inventoryId.slice(0, 8)}…
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
      )}
    </div>
  );
}

function LogTable({ rows }: { rows: Array<{ id: string; action: string; createdAt?: string; changedFields?: Array<{ field: string }> }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Action</th>
            <th className="py-2 pr-4">Fields</th>
            <th className="py-2">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => (
            <tr key={log.id} className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono text-xs">{log.id.slice(0, 8)}…</td>
              <td className="py-2 pr-4">{log.action}</td>
              <td className="py-2 pr-4">
                {log.changedFields?.length ? log.changedFields.map((c) => c.field).join(', ') : '—'}
              </td>
              <td className="py-2">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
