import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategorySelect } from '../components/CategorySelect';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Products as ProductsApi, uploadProductImage, listProductImages } from '../api';
import { useResourceMutations } from '../hooks/useResourceMutations';
import type { Product, ProductUnit } from '../types';

const UNIT_OPTIONS: ProductUnit[] = ['piece', 'kg', 'gram', 'litre', 'ml', 'box', 'pack', 'dozen'];

// Every field here matches core-apis' CreateProductRequest/UpdateProductRequest
// exactly (verified 2026-07-26 against products.controller.ts + the request
// DTOs) — no snake_case, no invented `code`/`status`/single `unit_price` fields.
interface FormState {
  name: string;
  categoryId: string;
  sku: string;
  barcode: string;
  description: string;
  unit: ProductUnit | '';
  costPrice: string;
  retailPrice: string;
  loyaltyPrice: string;
  wholesalePrice: string;
  transferPrice: string;
  reorderPoint: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  categoryId: '',
  sku: '',
  barcode: '',
  description: '',
  unit: '',
  costPrice: '',
  retailPrice: '',
  loyaltyPrice: '',
  wholesalePrice: '',
  transferPrice: '',
  reorderPoint: '',
};

export default function Products() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(ProductsApi, 'products', 'Product');

  const { data: images } = useQuery({
    queryKey: ['products', editing?.id, 'images'],
    queryFn: () => listProductImages(editing!.id),
    enabled: !!editing,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: Product) => {
    setEditing(row);
    setForm({
      name: row.name ?? '',
      categoryId: row.categoryId ?? '',
      sku: row.sku ?? '',
      barcode: row.barcode ?? '',
      description: row.description ?? '',
      unit: row.unit ?? '',
      costPrice: row.costPrice != null ? String(row.costPrice) : '',
      retailPrice: row.retailPrice != null ? String(row.retailPrice) : '',
      loyaltyPrice: row.loyaltyPrice != null ? String(row.loyaltyPrice) : '',
      wholesalePrice: row.wholesalePrice != null ? String(row.wholesalePrice) : '',
      transferPrice: row.transferPrice != null ? String(row.transferPrice) : '',
      reorderPoint: row.reorderPoint != null ? String(row.reorderPoint) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Partial<Product> = {
      name: form.name,
      categoryId: form.categoryId || undefined,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      unit: form.unit || undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      retailPrice: form.retailPrice ? Number(form.retailPrice) : undefined,
      loyaltyPrice: form.loyaltyPrice ? Number(form.loyaltyPrice) : undefined,
      wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : undefined,
      transferPrice: form.transferPrice ? Number(form.transferPrice) : undefined,
      reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      await uploadProductImage(editing.id, file);
      toast.success('Image uploaded');
      queryClient.invalidateQueries({ queryKey: ['products', editing.id, 'images'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const columns: Column<Product>[] = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    {
      key: 'retailPrice',
      label: 'Retail Price',
      render: (row) => `$${Number(row.retailPrice || 0).toFixed(2)}`,
    },
    { key: 'unit', label: 'Unit' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (row.isActive === false ? 'Inactive' : 'Active'),
    },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6" style={{ height: '100%' }}>
      <ERPDataTable
        title="Products"
        description="Manage your product catalog."
        queryKey="products"
        columns={columns}
        fetchData={(params) => ProductsApi.search(params)}
        searchPlaceholder="Search products…"
        isAdmin={true}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod-name">Name</Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelect value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-sku">SKU</Label>
              <Input id="prod-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-barcode">Barcode</Label>
              <Input
                id="prod-barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-description">Description</Label>
              <Input
                id="prod-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as ProductUnit })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit…" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prod-cost-price">Cost Price</Label>
                <Input
                  id="prod-cost-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-retail-price">Retail Price</Label>
                <Input
                  id="prod-retail-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.retailPrice}
                  onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-loyalty-price">Loyalty Price</Label>
                <Input
                  id="prod-loyalty-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.loyaltyPrice}
                  onChange={(e) => setForm({ ...form, loyaltyPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-wholesale-price">Wholesale Price</Label>
                <Input
                  id="prod-wholesale-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.wholesalePrice}
                  onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-transfer-price">Transfer Price</Label>
                <Input
                  id="prod-transfer-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.transferPrice}
                  onChange={(e) => setForm({ ...form, transferPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-reorder-point">Reorder Point</Label>
                <Input
                  id="prod-reorder-point"
                  type="number"
                  min="0"
                  value={form.reorderPoint}
                  onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                />
              </div>
            </div>

            {editing && (
              <div className="space-y-2">
                <Label>Images</Label>
                <div className="flex flex-wrap gap-2">
                  {(images ?? []).map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="h-16 w-16 rounded object-cover border border-border"
                    />
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0])}
                  disabled={uploading}
                  className="text-sm"
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product"
        description={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        isPending={removeMutation.isPending}
        onConfirm={() =>
          deleteTarget && removeMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
      />
    </div>
  );
}
