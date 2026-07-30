import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ResourceSelect } from '../components/ResourceSelect';
import { Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Products as ProductsApi,
  Inventory as InventoryApi,
  listProductLogsByProduct,
  listProductLogsByInventory,
  getProductLog,
} from '../api';
import type { InventoryItem, ProductLog } from '../types';

type Mode = 'product' | 'inventory' | 'id';

function inventoryLabel(item: InventoryItem): string {
  return item.name || `Inventory ${item.id.slice(0, 8)}`;
}

export default function ProductLogs() {
  const [mode, setMode] = useState<Mode>('product');
  const [productId, setProductId] = useState('');
  const [inventoryId, setInventoryId] = useState('');
  const [logId, setLogId] = useState('');
  const [active, setActive] = useState<{ mode: Mode; id: string } | null>(null);

  const listQuery = useQuery({
    queryKey: ['product-logs', active?.mode, active?.id],
    queryFn: async (): Promise<ProductLog[]> => {
      if (!active) return [];
      if (active.mode === 'product') return listProductLogsByProduct(active.id);
      if (active.mode === 'inventory') return listProductLogsByInventory(active.id);
      const one = await getProductLog(active.id);
      return [one];
    },
    enabled: !!active?.id,
    retry: false,
  });

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'product') {
      if (!productId) {
        toast.error('Select a product');
        return;
      }
      setActive({ mode: 'product', id: productId });
      return;
    }
    if (mode === 'inventory') {
      if (!inventoryId) {
        toast.error('Select an inventory record');
        return;
      }
      setActive({ mode: 'inventory', id: inventoryId });
      return;
    }
    const id = logId.trim();
    if (!id) {
      toast.error('Enter a product log UUID');
      return;
    }
    setActive({ mode: 'id', id });
  };

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Product Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Read-only audit trail for product and inventory changes.
        </p>
      </div>

      <form onSubmit={handleLoad} className="space-y-4">
        <Field label="Lookup by">
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="id">Log ID</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {mode === 'product' && (
          <Field label="Product">
            <ResourceSelect
              queryKey="products"
              fetchList={() => ProductsApi.list()}
              getLabel={(p) => p.name || p.id}
              value={productId}
              onValueChange={setProductId}
            />
          </Field>
        )}
        {mode === 'inventory' && (
          <Field label="Inventory">
            <ResourceSelect
              queryKey="inventory"
              fetchList={() => InventoryApi.list()}
              getLabel={inventoryLabel}
              value={inventoryId}
              onValueChange={setInventoryId}
            />
          </Field>
        )}
        {mode === 'id' && (
          <Field label="Product log ID">
            <Input
              value={logId}
              onChange={(e) => setLogId(e.target.value)}
              placeholder="Paste UUID…"
            />
          </Field>
        )}

        <Button type="submit" disabled={listQuery.isFetching}>
          {listQuery.isFetching ? 'Loading…' : 'Load logs'}
        </Button>
      </form>

      {listQuery.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {(listQuery.error as Error).message || 'Failed to load logs'}
        </div>
      )}

      <FormSection title="Results">
        {!active ? (
          <p className="text-sm text-muted-foreground">Choose a lookup and load logs.</p>
        ) : rows.length === 0 && !listQuery.isFetching ? (
          <p className="text-sm text-muted-foreground">No logs found.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Inventory</th>
                  <th className="px-3 py-2 font-medium">Changed fields</th>
                  <th className="px-3 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">{row.action}</td>
                    <td className="px-3 py-2 font-mono text-xs break-all">{row.productId}</td>
                    <td className="px-3 py-2 font-mono text-xs break-all">
                      {row.inventoryId || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-md">
                      {row.changedFields?.length
                        ? row.changedFields
                            .map((c) => `${c.field}: ${String(c.oldValue)} → ${String(c.newValue)}`)
                            .join('; ')
                        : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>
    </div>
  );
}
