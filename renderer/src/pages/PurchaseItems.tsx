import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdvancedIdLookup } from "../components/AdvancedIdLookup";
import { RecentRecords } from "../components/RecentRecords";
import { FormDrawer, Field, FormSection } from "../components/FormDrawer";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ResourceSelect } from "../components/ResourceSelect";
import { PurchaseItems, Products, get } from "../api";
import { formatEntityLabel } from "../lib/entityLabel";
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from "../lib/recentIds";
import type { PurchaseItem } from "../types";

interface FormState {
  purchaseOrderId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_FORM: FormState = {
  purchaseOrderId: "",
  productId: "",
  quantity: "",
  unitPrice: "",
};

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success("ID copied"),
    () => toast.error("Could not copy ID"),
  );
}

function purchaseItemLabel(
  item: PurchaseItem,
  productName: Map<string, string>,
) {
  const prod = item.productId
    ? (productName.get(item.productId) ??
      formatEntityLabel({ id: item.productId }))
    : undefined;
  const qty = item.quantity != null ? String(item.quantity) : undefined;
  if (prod && qty) return `${prod} × ${qty}`;
  if (prod) return prod;
  if (qty) return `Qty ${qty}`;
  return formatEntityLabel({ id: item.id });
}

export default function PurchaseItemsPage() {
  const recent = useRecentIds(RECENT_NS.purchaseItems);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = useState<FormState>(EMPTY_FORM);
  const [lookupId, setLookupId] = useState("");
  const [activeId, setActiveId] = useState<string | undefined>();

  const closeDrawer = () => setDrawerOpen(false);
  const {
    data: lookedUp,
    isLoading: lookupLoading,
    error: lookupError,
  } = PurchaseItems.useGet(activeId);
  const { data: products } = Products.useList();

  const productName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) {
      m.set(p.id, formatEntityLabel({ name: p.name, sku: p.sku, id: p.id }));
    }
    return m;
  }, [products]);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ["purchase-items", e.id] as const,
      queryFn: () => get<PurchaseItem>(`/api/v1/purchase-items/${e.id}`),
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
          productId: data?.productId,
          quantity: data?.quantity,
          purchaseOrderId: data?.purchaseOrderId,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = lookedUp;
    if (!loaded || loaded.id !== activeId) return;
    recent.push(loaded.id, purchaseItemLabel(loaded, productName));
  }, [activeId, lookedUp, productName, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error("Enter a purchase item ID");
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadItem = () => loadById(lookupId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const productLabelFor = (productId: string | undefined) => {
    if (!productId) return "—";
    return productName.get(productId) ?? formatEntityLabel({ id: productId });
  };

  const poLabelFor = (purchaseOrderId: string | undefined) => {
    if (!purchaseOrderId) return "—";
    return formatEntityLabel({ id: purchaseOrderId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Items</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Look up purchase items by ID and reopen recent items saved in this
            browser. Create blocked by Core API column mismatch (#0b).
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} variant="outline" disabled>
          New Purchase Item (blocked)
        </Button>
      </div>

      {/* <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Verified: request/command use <code className="text-xs">quantity</code> /{' '}
        <code className="text-xs">unitPrice</code>; entity requires{' '}
        <code className="text-xs">quantityOrdered</code> / <code className="text-xs">unitCost</code>. Client
        cannot rename through the wire.
      </div> */}

      <RecentRecords
        title="Recent purchase items"
        emptyHint="No recent purchase items yet. Use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: "product",
            header: "Product",
            render: (r) => {
              if (r.loading) return "…";
              if (r.failed) return r.label?.trim() || "unavailable";
              if (r.productId) return productLabelFor(r.productId);
              return r.label || "—";
            },
          },
          {
            key: "qty",
            header: "Qty",
            render: (r) =>
              r.loading
                ? "…"
                : r.failed
                  ? "unavailable"
                  : r.quantity != null
                    ? r.quantity
                    : "—",
          },
          {
            key: "po",
            header: "Purchase order",
            render: (r) =>
              r.loading
                ? "…"
                : r.failed
                  ? "unavailable"
                  : poLabelFor(r.purchaseOrderId),
          },
          {
            key: "saved",
            header: "Saved",
            render: (r) => new Date(r.savedAt).toLocaleString(),
          },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => loadById(r.id)}
                >
                  Open
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => recent.remove(r.id)}
                >
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
        entityLabel="purchase item"
        value={lookupId}
        onChange={setLookupId}
        onLoad={loadItem}
      />

      {activeId && (
        <FormSection title="Purchase item details">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">
              Purchase item not found
              {lookupError instanceof Error && lookupError.message
                ? `: ${lookupError.message}`
                : "."}
            </p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyId(lookedUp.id)}
                >
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">Purchase order:</span>{" "}
                {poLabelFor(lookedUp.purchaseOrderId)}
              </p>
              <p>
                <span className="text-muted-foreground">Product:</span>{" "}
                {productLabelFor(lookedUp.productId)}
              </p>
              <p>
                <span className="text-muted-foreground">Quantity:</span>{" "}
                {lookedUp.quantity != null ? lookedUp.quantity : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Unit price:</span>{" "}
                {lookedUp.unitPrice != null ? lookedUp.unitPrice : "—"}
              </p>
            </div>
          )}
        </FormSection>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Purchase Item"
        footer={
          <>
            <Button type="submit" form="purchase-item-form" disabled>
              Create (blocked — Core API #0b)
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form
          id="purchase-item-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <Field label="Purchase Order ID">
            <Input
              value={form.purchaseOrderId}
              disabled
              onChange={() => undefined}
            />
          </Field>
          <Field label="Product">
            <ResourceSelect
              resource={Products}
              getLabel={(p) => p.name || p.sku || p.id}
              value={form.productId}
              onValueChange={() => undefined}
              placeholder="Select product…"
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              value={form.quantity}
              disabled
              onChange={() => undefined}
            />
          </Field>
          <Field label="Unit Price">
            <Input
              type="number"
              value={form.unitPrice}
              disabled
              onChange={() => undefined}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
