import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, Column } from "../components/DataTable";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FormDrawer, Field } from "../components/FormDrawer";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PurchaseOrders, Stores, Suppliers } from "../api";
import { usePagination } from "../hooks/usePagination";
import { formatEntityLabel, truncateId } from "../lib/entityLabel";
import type { PurchaseOrder } from "../types";

interface FormState {
  name: string;
}

const EMPTY_FORM: FormState = { name: "" };

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null);
  const [storeFilter, setStoreFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");

  const updateMutation = PurchaseOrders.useUpdate();
  const removeMutation = PurchaseOrders.useDelete();
  const { page, setPage } = usePagination();
  const { data: stores = [] } = Stores.useList();
  const { data: suppliers = [] } = Suppliers.useList();

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (storeFilter) next.storeId = storeFilter;
    if (supplierFilter) next.supplierId = supplierFilter;
    return Object.keys(next).length ? next : undefined;
  }, [storeFilter, supplierFilter]);

  const { data, isLoading, isError, error, refetch } = PurchaseOrders.useSearch(
    {
      page,
      filters,
    },
  );
  const listError = isError
    ? `Unable to load purchase orders.${error instanceof Error && error.message ? ` (${error.message})` : ""}`
    : null;

  const closeDrawer = () => setDrawerOpen(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (row: PurchaseOrder) => {
    setEditing(row);
    setForm({ name: row.name ?? "" });
    setDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    // Update only sets name in Core API too — still hollow, but allowed for attempt on existing rows.
    updateMutation.mutate(
      { id: editing.id, body: { name: form.name || undefined } },
      { onSuccess: closeDrawer },
    );
  };

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "name",
      label: "PO",
      render: (row) => formatEntityLabel({ name: row.name, id: row.id }),
    },
    {
      key: "id",
      label: "ID",
      render: (row) => truncateId(row.id),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => (row.createdAt || row.created_at) ? new Date(row.createdAt || row.created_at!).toLocaleString() : "—",
    },
  ];

  return (
    <div className="space-y-4" style={{ height: "100%" }}>
      {/* <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
        Create blocked — verified: handler persists only <code className="text-[10px]">{'{ name }'}</code> but
        entity requires storeId/supplierId/poNumber and has no name column (#0). List/search still work for
        seeded rows (id / createdAt). Response omits storeId/supplierId/poNumber — filters still hit Core
        query params.
      </div> */}
      <p className="text-xs text-muted-foreground">
        API gap: no free-text PO search; filter by store and supplier only.
        Labels use name when present.
      </p>
      <DataTable
        title="Purchase Orders"
        description="Browse POs. Open a row for detail. Create needs a Core API fix."
        columns={columns}
        rows={listError ? [] : (data?.items ?? [])}
        total={listError ? 0 : (data?.total ?? 0)}
        page={page}
        loading={isLoading && !isError}
        error={listError}
        onPageChange={setPage}
        hideSearch
        toolbar={
          <>
            <span className="text-xs text-muted-foreground">Store:</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={storeFilter}
              onChange={(e) => {
                setStoreFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatEntityLabel({ name: s.name, code: s.code, id: s.id })}
                </option>
              ))}
            </select>
            <span className="ml-2 text-xs text-muted-foreground">
              Supplier:
            </span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatEntityLabel({ name: s.name, id: s.id })}
                </option>
              ))}
            </select>
          </>
        }
        onRefetch={() => void refetch()}
        isAdmin={true}
        onAdd={openCreate}
        onView={(row) => navigate(`/purchase-orders/${row.id}`)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? "Edit Purchase Order" : "Add Purchase Order"}
        footer={
          <>
            <Button
              type="submit"
              form="purchase-order-form"
              disabled={!editing || updateMutation.isPending}
            >
              {editing
                ? updateMutation.isPending
                  ? "Saving…"
                  : "Save"
                : "Create (blocked — Core API #0)"}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form
          id="purchase-order-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {!editing && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
              Create cannot succeed until Core API maps real PO fields onto the
              entity.
            </div>
          )}
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              autoFocus
              disabled={!editing}
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Purchase Order"
        description="Delete this purchase order? This can't be undone."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget &&
          removeMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }
      />
    </div>
  );
}
