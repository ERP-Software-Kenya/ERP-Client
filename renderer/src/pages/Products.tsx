import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { ERPDataTable, Column } from '../components/ERPDataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CategorySelect } from '../components/CategorySelect';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { ImageLightbox } from '../components/ImageLightbox';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
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

function revokePending(files: PendingImage[]) {
  for (const item of files) URL.revokeObjectURL(item.previewUrl);
}

export default function Products() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const { createMutation, updateMutation, removeMutation } = useResourceMutations(ProductsApi, 'products', 'Product');

  const { data: images } = useQuery({
    queryKey: ['products', editing?.id, 'images'],
    queryFn: () => listProductImages(editing!.id),
    enabled: !!editing,
  });

  const pendingImagesRef = useRef<PendingImage[]>([]);
  pendingImagesRef.current = pendingImages;

  useEffect(() => {
    return () => revokePending(pendingImagesRef.current);
  }, []);

  const clearPending = () => {
    setPendingImages((prev) => {
      revokePending(prev);
      return [];
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    clearPending();
    setDrawerOpen(true);
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
    clearPending();
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    clearPending();
    setDrawerOpen(false);
  };

  const uploadFiles = async (productId: string, files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await uploadProductImage(productId, file);
      }
      toast.success(files.length === 1 ? 'Image uploaded' : `${files.length} images uploaded`);
      queryClient.invalidateQueries({ queryKey: ['products', productId, 'images'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
      throw err;
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeDrawer });
    } else {
      const queued = pendingImages.map((p) => p.file);
      createMutation.mutate(body, {
        onSuccess: async (created) => {
          try {
            if (queued.length) await uploadFiles(created.id, queued);
          } catch {
            // Product was created; image failure already toasted. Still close.
          }
          clearPending();
          setDrawerOpen(false);
        },
      });
    }
  };

  const handleFilePick = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);

    if (editing) {
      try {
        await uploadFiles(editing.id, files);
      } catch {
        // toasted in uploadFiles
      }
      return;
    }

    setPendingImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePending = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
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

  const isSaving = createMutation.isPending || updateMutation.isPending || uploading;

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

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editing ? 'Edit Product' : 'New Product'}
        width={640}
        footer={
          <>
            <Button type="submit" form="product-form" disabled={isSaving}>
              {uploading ? 'Uploading…' : isSaving ? 'Saving…' : 'Save Product'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer} disabled={uploading}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
                placeholder="e.g. Cooking Oil 5L"
              />
            </Field>
            <Field label="SKU">
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="e.g. OIL-5L-001"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Barcode">
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </Field>
            <Field label="Unit">
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
            </Field>
          </div>

          <Field label="Category">
            <CategorySelect value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })} />
          </Field>

          <FormSection title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cost Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                />
              </Field>
              <Field label="Retail Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.retailPrice}
                  onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                />
              </Field>
              <Field label="Loyalty Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.loyaltyPrice}
                  onChange={(e) => setForm({ ...form, loyaltyPrice: e.target.value })}
                />
              </Field>
              <Field label="Wholesale Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.wholesalePrice}
                  onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                />
              </Field>
              <Field label="Transfer Price">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.transferPrice}
                  onChange={(e) => setForm({ ...form, transferPrice: e.target.value })}
                />
              </Field>
              <Field label="Min Stock Level" hint="Maps to reorder point">
                <Input
                  type="number"
                  min="0"
                  value={form.reorderPoint}
                  onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                />
              </Field>
            </div>
          </FormSection>

          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <FormSection title="Images" className="space-y-3">
            {!editing && (
              <p className="text-xs text-muted-foreground">
                Images are uploaded automatically after the product is created. Click an image to
                enlarge; use Delete to remove pending files.
              </p>
            )}
            {editing && (
              <p className="text-xs text-muted-foreground">
                Click an image to enlarge. Removing saved images from the server is not available yet.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {editing &&
                (images ?? []).map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => img.url && setPreviewSrc(img.url)}
                    className="group relative h-16 w-16 overflow-hidden rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="View image"
                  >
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                  </button>
                ))}
              {pendingImages.map((item) => (
                <div key={item.id} className="relative h-16 w-16">
                  <button
                    type="button"
                    onClick={() => setPreviewSrc(item.previewUrl)}
                    className="h-16 w-16 overflow-hidden rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="View image"
                  >
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePending(item.id);
                      if (previewSrc === item.previewUrl) setPreviewSrc(null);
                    }}
                    className="absolute -right-1.5 -top-1.5 z-10 rounded-full bg-destructive p-1 text-destructive-foreground shadow hover:bg-destructive/90"
                    aria-label="Delete image"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilePick(e.target.files)}
              disabled={uploading}
            />
          </FormSection>
        </form>
      </FormDrawer>

      <ImageLightbox src={previewSrc} onClose={() => setPreviewSrc(null)} />

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
