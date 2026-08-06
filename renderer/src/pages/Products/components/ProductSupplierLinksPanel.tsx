import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ResourceSelect } from '../../../components/ResourceSelect';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Suppliers,
  useProductSuppliers,
  useLinkProductSupplier,
  useUpdateProductSupplier,
  useUnlinkProductSupplier,
} from '../../../api';

interface SupplierLinkForm {
  supplierId: string;
  unitCost: string;
  leadTimeDays: string;
  minOrderQty: string;
  isDefault: boolean;
}

const EMPTY_SUPPLIER_FORM: SupplierLinkForm = {
  supplierId: '',
  unitCost: '',
  leadTimeDays: '',
  minOrderQty: '',
  isDefault: false,
};

export function ProductSupplierLinksPanel({ productId }: { productId: string }) {
  const [supplierForm, setSupplierForm] = useState<SupplierLinkForm>(EMPTY_SUPPLIER_FORM);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkEditForm, setLinkEditForm] = useState<SupplierLinkForm>(EMPTY_SUPPLIER_FORM);

  const { data: allSuppliers } = Suppliers.useList();
  const { data: productSuppliers } = useProductSuppliers(productId);

  const linkSupplierMutation = useLinkProductSupplier(productId);
  const updateSupplierLinkMutation = useUpdateProductSupplier(productId);
  const unlinkSupplierMutation = useUnlinkProductSupplier(productId);

  useEffect(() => {
    if (linkSupplierMutation.isSuccess) setSupplierForm(EMPTY_SUPPLIER_FORM);
  }, [linkSupplierMutation.isSuccess]);
  useEffect(() => {
    if (updateSupplierLinkMutation.isSuccess) setEditingLinkId(null);
  }, [updateSupplierLinkMutation.isSuccess]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(productSuppliers ?? []).map((link) => {
          const supplier = allSuppliers?.find((s) => s.id === link.supplierId);
          const isEditingRow = editingLinkId === link.id;
          return (
            <div key={link.id} className="rounded-md border border-border p-2 text-sm">
              {!isEditingRow ? (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{supplier?.name ?? link.supplierId}</span>
                    {link.isDefault && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        Default
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {link.unitCost != null && `Cost $${link.unitCost}`}
                      {link.leadTimeDays != null && ` · Lead ${link.leadTimeDays}d`}
                      {link.minOrderQty != null && ` · MOQ ${link.minOrderQty}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingLinkId(link.id);
                        setLinkEditForm({
                          supplierId: link.supplierId,
                          unitCost: link.unitCost != null ? String(link.unitCost) : '',
                          leadTimeDays: link.leadTimeDays != null ? String(link.leadTimeDays) : '',
                          minOrderQty: link.minOrderQty != null ? String(link.minOrderQty) : '',
                          isDefault: link.isDefault,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => unlinkSupplierMutation.mutate(link.supplierId)}
                      disabled={unlinkSupplierMutation.isPending}
                      aria-label="Unlink supplier"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Unit cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={linkEditForm.unitCost}
                      onChange={(e) => setLinkEditForm({ ...linkEditForm, unitCost: e.target.value })}
                    />
                    <Input
                      placeholder="Lead days"
                      type="number"
                      min="0"
                      value={linkEditForm.leadTimeDays}
                      onChange={(e) => setLinkEditForm({ ...linkEditForm, leadTimeDays: e.target.value })}
                    />
                    <Input
                      placeholder="Min qty"
                      type="number"
                      min="0"
                      value={linkEditForm.minOrderQty}
                      onChange={(e) => setLinkEditForm({ ...linkEditForm, minOrderQty: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={linkEditForm.isDefault}
                      onChange={(e) => setLinkEditForm({ ...linkEditForm, isDefault: e.target.checked })}
                    />
                    Default supplier
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={updateSupplierLinkMutation.isPending}
                      onClick={() =>
                        updateSupplierLinkMutation.mutate({
                          supplierId: link.supplierId,
                          body: {
                            unitCost: linkEditForm.unitCost ? Number(linkEditForm.unitCost) : undefined,
                            leadTimeDays: linkEditForm.leadTimeDays ? Number(linkEditForm.leadTimeDays) : undefined,
                            minOrderQty: linkEditForm.minOrderQty ? Number(linkEditForm.minOrderQty) : undefined,
                            isDefault: linkEditForm.isDefault,
                          },
                        })
                      }
                    >
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingLinkId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!productSuppliers?.length && (
          <p className="text-xs text-muted-foreground">No suppliers linked yet.</p>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <ResourceSelect
          resource={Suppliers}
          getLabel={(s) => s.name}
          value={supplierForm.supplierId}
          onValueChange={(v) => setSupplierForm({ ...supplierForm, supplierId: v })}
          placeholder="Select supplier to link…"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Unit cost"
            type="number"
            step="0.01"
            min="0"
            value={supplierForm.unitCost}
            onChange={(e) => setSupplierForm({ ...supplierForm, unitCost: e.target.value })}
          />
          <Input
            placeholder="Lead days"
            type="number"
            min="0"
            value={supplierForm.leadTimeDays}
            onChange={(e) => setSupplierForm({ ...supplierForm, leadTimeDays: e.target.value })}
          />
          <Input
            placeholder="Min qty"
            type="number"
            min="0"
            value={supplierForm.minOrderQty}
            onChange={(e) => setSupplierForm({ ...supplierForm, minOrderQty: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={supplierForm.isDefault}
            onChange={(e) => setSupplierForm({ ...supplierForm, isDefault: e.target.checked })}
          />
          Default supplier
        </label>
        <Button
          type="button"
          size="sm"
          disabled={!supplierForm.supplierId || linkSupplierMutation.isPending}
          onClick={() =>
            linkSupplierMutation.mutate({
              supplierId: supplierForm.supplierId,
              unitCost: supplierForm.unitCost ? Number(supplierForm.unitCost) : undefined,
              leadTimeDays: supplierForm.leadTimeDays ? Number(supplierForm.leadTimeDays) : undefined,
              minOrderQty: supplierForm.minOrderQty ? Number(supplierForm.minOrderQty) : undefined,
              isDefault: supplierForm.isDefault,
            })
          }
        >
          Link Supplier
        </Button>
      </div>
    </div>
  );
}
