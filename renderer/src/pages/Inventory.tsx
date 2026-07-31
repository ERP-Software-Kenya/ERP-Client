import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FormDrawer, Field } from '../components/FormDrawer';
import { ViewDrawer } from '../components/ViewDrawer';
import { ResourceSelect } from '../components/ResourceSelect';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Inventory, Locations, Products, useStockOperation } from '../api';
import { usePagination } from '../hooks/usePagination';
import type { InventoryItem } from '../types';

interface CreateForm {
  locationId: string;
  productId: string;
  reorderLevel: string;
  maxStock: string;
  binLocation: string;
  /** Optional opening qty — applied via POST /stock-movements/add after create. */
  initialQuantity: string;
}

interface EditForm {
  reorderLevel: string;
  maxStock: string;
  binLocation: string;
}

const EMPTY_CREATE: CreateForm = {
  locationId: '',
  productId: '',
  reorderLevel: '',
  maxStock: '',
  binLocation: '',
  initialQuantity: '',
};
const EMPTY_EDIT: EditForm = { reorderLevel: '', maxStock: '', binLocation: '' };

export default function InventoryPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [viewRow, setViewRow] = useState<InventoryItem | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);

  const createMutation = Inventory.useCreate();
  const updateMutation = Inventory.useUpdate();
  const removeMutation = Inventory.useDelete();
  const stockOp = useStockOperation();
  const { page, setPage, setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, error, refetch } = Inventory.useSearch({ page, search: debouncedSearch });

  const { data: products } = Products.useList();
  const { data: locations } = Locations.useList();
  const productName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, p.name || p.sku || p.id.slice(0, 8));
    return m;
  }, [products]);
  const locationName = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations ?? []) {
      m.set(l.id, l.type ? `${l.name} (${l.type})` : l.name);
    }
    return m;
  }, [locations]);

  const openCreate = () => {
    setEditing(null);
    setCreateForm(EMPTY_CREATE);
    setDrawerOpen(true);
  };

  const openEdit = (row: InventoryItem) => {
    setEditing(row);
    setEditForm({
      reorderLevel: row.reorderLevel != null ? String(row.reorderLevel) : '',
      maxStock: row.maxStock != null ? String(row.maxStock) : '',
      binLocation: row.binLocation ?? '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          body: {
            reorderLevel: editForm.reorderLevel ? Number(editForm.reorderLevel) : undefined,
            maxStock: editForm.maxStock ? Number(editForm.maxStock) : undefined,
            binLocation: editForm.binLocation || undefined,
          },
        },
        { onSuccess: closeDrawer },
      );
      return;
    }
    if (!createForm.locationId || !createForm.productId) {
      toast.error('Location and product are required');
      return;
    }
    const initialQty = createForm.initialQuantity ? Number(createForm.initialQuantity) : 0;
    void (async () => {
      setCreating(true);
      try {
        const created = await createMutation.mutateAsync({
          locationId: createForm.locationId,
          productId: createForm.productId,
          reorderLevel: createForm.reorderLevel ? Number(createForm.reorderLevel) : 0,
          maxStock: createForm.maxStock ? Number(createForm.maxStock) : undefined,
          binLocation: createForm.binLocation || undefined,
        });
        if (initialQty > 0 && created?.id) {
          try {
            await stockOp.mutateAsync({
              op: 'add',
              body: {
                inventoryId: created.id,
                locationId: createForm.locationId,
                productId: createForm.productId,
                quantity: initialQty,
                notes: 'Initial stock on inventory create',
              },
            });
            toast.success(`Opening qty ${initialQty} added`);
          } catch (err) {
            toast.error(
              err instanceof Error
                ? `Record created, but initial stock failed: ${err.message}`
                : 'Record created, but initial stock failed',
            );
          }
        }
        closeDrawer();
      } catch {
        /* createMutation already toasts */
      } finally {
        setCreating(false);
      }
    })();
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'productId',
      label: 'Product',
      render: (row) => productName.get(row.productId) ?? row.productId.slice(0, 8),
    },
    {
      key: 'locationId',
      label: 'Location',
      render: (row) => locationName.get(row.locationId) ?? row.locationId.slice(0, 8),
    },
    { key: 'quantityOnHand', label: 'On hand' },
    { key: 'quantityReserved', label: 'Reserved' },
    {
      key: 'available',
      label: 'Available',
      render: (row) => row.quantityOnHand - row.quantityReserved,
    },
    { key: 'reorderLevel', label: 'Reorder' },
    { key: 'binLocation', label: 'Bin' },
  ];

  const isSaving = creating || createMutation.isPending || updateMutation.isPending || stockOp.isPending;

  return (
    <div className="space-y-4" style={{ height: '100%' }}>
      <DataTable
        title="Inventory"
        description="Create a product+location record, optionally with opening qty (via stock-movements/add). Later qty changes use Stock Movements."
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        loading={isLoading}
        error={error ? String(error) : null}
        onPageChange={setPage}
        onSearchChange={setSearch}
        onRefetch={() => void refetch()}
        searchPlaceholder="Search inventory…"
        isAdmin
        onAdd={openCreate}
        onView={(row) => setViewRow(row)}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <ViewDrawer
        open={viewRow != null}
        title="View Inventory"
        data={viewRow as Record<string, unknown> | null}
        onClose={() => setViewRow(null)}
      />

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit inventory settings' : 'New inventory record'}
        subtitle={editing ? 'Reorder, max stock, and bin only' : 'Location + product; optional opening qty'}
        footer={
          <>
            <Button type="submit" form="inventory-form" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <>
              <Field label="Location" required>
                <ResourceSelect
                  resource={Locations}
                  getLabel={(l) => (l.type ? `${l.name} (${l.type})` : l.name)}
                  value={createForm.locationId}
                  onValueChange={(v) => setCreateForm({ ...createForm, locationId: v })}
                />
                <p className="text-xs text-muted-foreground">
                  Need a new place?{' '}
                  <Link to="/locations" className="underline hover:text-foreground">
                    Create at Locations
                  </Link>
                </p>
              </Field>
              <Field label="Product" required>
                <ResourceSelect
                  resource={Products}
                  getLabel={(p) => p.name || p.sku || p.id.slice(0, 8)}
                  value={createForm.productId}
                  onValueChange={(v) => setCreateForm({ ...createForm, productId: v })}
                />
              </Field>
              <Field label="Opening quantity">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={createForm.initialQuantity}
                  onChange={(e) => setCreateForm({ ...createForm, initialQuantity: e.target.value })}
                  placeholder="0 — leave blank for empty bin"
                />
                <p className="text-xs text-muted-foreground">
                  Create starts at 0 on hand. If set, client calls stock-movements/add right after.
                </p>
              </Field>
            </>
          )}
          <Field label="Reorder level">
            <Input
              type="number"
              min="0"
              value={editing ? editForm.reorderLevel : createForm.reorderLevel}
              onChange={(e) =>
                editing
                  ? setEditForm({ ...editForm, reorderLevel: e.target.value })
                  : setCreateForm({ ...createForm, reorderLevel: e.target.value })
              }
            />
          </Field>
          <Field label="Max stock">
            <Input
              type="number"
              min="0"
              value={editing ? editForm.maxStock : createForm.maxStock}
              onChange={(e) =>
                editing
                  ? setEditForm({ ...editForm, maxStock: e.target.value })
                  : setCreateForm({ ...createForm, maxStock: e.target.value })
              }
            />
          </Field>
          <Field label="Bin location">
            <Input
              value={editing ? editForm.binLocation : createForm.binLocation}
              onChange={(e) =>
                editing
                  ? setEditForm({ ...editForm, binLocation: e.target.value })
                  : setCreateForm({ ...createForm, binLocation: e.target.value })
              }
            />
          </Field>
        </form>
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete inventory record"
        description="Remove this inventory row? Stock history may remain in the system."
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
