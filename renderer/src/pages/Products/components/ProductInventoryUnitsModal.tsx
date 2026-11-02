import { useEffect, useState } from 'react';
import { Boxes, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { FormDrawer } from '../../../components/FormDrawer';
import { Button } from '../../../components/ui/button';
import { Inventory, Locations, OrganizationUnits, Products } from '../../../api';
import { useSession } from '../../../context/SessionContext';
import type { Product } from '../../../types';
import { ProductUnitConversionEditor, type ProductUnitDraft } from './ProductUnitConversionEditor';

interface Props {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductInventoryUnitsModal({ product, onClose, onSaved }: Props) {
  const { isOrgAdmin, isSuperAdmin } = useSession();
  const canManage = isOrgAdmin || isSuperAdmin;
  const { data: inventory = [], isLoading: inventoryLoading } = Inventory.useByProduct(product?.id);
  const { data: locations = [] } = Locations.useList();
  const { data: catalog = [] } = OrganizationUnits.useList();
  const update = Products.useUpdate();
  const [units, setUnits] = useState<ProductUnitDraft[]>([]);
  const [baseUnitId, setBaseUnitId] = useState('');
  const [defaultSaleUnitId, setDefaultSaleUnitId] = useState('');
  const [defaultPurchaseUnitId, setDefaultPurchaseUnitId] = useState('');

  useEffect(() => {
    if (!product) return;
    const legacyDefault = product.units?.find((unit) => unit.isDefault)?.unitId ?? '';
    setUnits(product.units?.map((unit) => ({
      unitId: unit.unitId,
      conversionFactor: unit.conversionFactor ?? '1',
      allowedForSale: unit.allowedForSale ?? true,
      allowedForPurchase: unit.allowedForPurchase ?? true,
      barcode: unit.barcode,
      isActive: unit.isActive ?? true,
    })) ?? []);
    setBaseUnitId(product.baseUnitId ?? legacyDefault);
    setDefaultSaleUnitId(product.defaultSaleUnitId ?? legacyDefault);
    setDefaultPurchaseUnitId(product.defaultPurchaseUnitId ?? legacyDefault);
  }, [product]);

  if (!product) return null;

  const save = async () => {
    if (!baseUnitId || !units.length) {
      toast.error('Configure at least one base unit.');
      return;
    }
    if (units.some((unit) => !/^\d+(?:\.\d{1,8})?$/.test(unit.conversionFactor) || !/[1-9]/.test(unit.conversionFactor))) {
      toast.error('Every conversion factor must be a positive decimal with at most 8 decimal places.');
      return;
    }
    if (!units.some((unit) => unit.unitId === defaultSaleUnitId && unit.allowedForSale && unit.isActive)) {
      toast.error('Choose an active sales-enabled default unit.');
      return;
    }
    if (!units.some((unit) => unit.unitId === defaultPurchaseUnitId && unit.allowedForPurchase && unit.isActive)) {
      toast.error('Choose an active purchase-enabled default unit.');
      return;
    }
    await update.mutateAsync({
      id: product.id,
      body: { units, baseUnitId, defaultSaleUnitId, defaultPurchaseUnitId },
    });
    onSaved();
    onClose();
  };

  const activeCatalog = catalog.filter((unit) => unit.isActive || units.some((item) => item.unitId === unit.id));
  const baseSymbol = product.units?.find((unit) => unit.unitId === product.baseUnitId)?.unitSymbol
    ?? product.units?.find((unit) => unit.isDefault)?.unitSymbol
    ?? 'base units';

  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Inventory & units"
      subtitle={product.name ?? product.sku ?? product.id}
      width={760}
      footer={canManage ? (
        <>
          <Button onClick={() => void save()} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save unit configuration'}</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </>
      ) : <Button variant="outline" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Boxes size={17} className="text-primary" />
            <div><h3 className="text-sm font-semibold">Inventory by location</h3><p className="text-xs text-muted-foreground">Balances are displayed in the product's base inventory unit.</p></div>
          </div>
          {inventoryLoading ? <p className="text-sm text-muted-foreground">Loading inventory…</p> : inventory.length ? (
            <div className="overflow-hidden rounded-lg border border-border">
              {inventory.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-5 border-b border-border px-4 py-3 text-sm last:border-b-0">
                  <span className="font-medium">{locations.find((location) => location.id === item.locationId)?.name ?? `Location ${item.locationId}`}</span>
                  <span><span className="text-muted-foreground">On hand:</span> {item.quantityOnHand} {baseSymbol}</span>
                  <span><span className="text-muted-foreground">Available:</span> {Number(item.quantityOnHand) - Number(item.quantityReserved)} {baseSymbol}</span>
                </div>
              ))}
            </div>
          ) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No inventory record exists for this product yet.</p>}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Ruler size={17} className="text-primary" />
            <div><h3 className="text-sm font-semibold">Product unit conversions</h3><p className="text-xs text-muted-foreground">Conversions belong to this product, not its inventory rows.</p></div>
          </div>
          {canManage ? (
            <ProductUnitConversionEditor
              availableUnits={activeCatalog}
              units={units}
              onChange={setUnits}
              baseUnitId={baseUnitId}
              onBaseUnitChange={setBaseUnitId}
              defaultSaleUnitId={defaultSaleUnitId}
              onDefaultSaleUnitChange={setDefaultSaleUnitId}
              defaultPurchaseUnitId={defaultPurchaseUnitId}
              onDefaultPurchaseUnitChange={setDefaultPurchaseUnitId}
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              {product.units?.length ? product.units.map((unit) => (
                <div key={unit.id ?? unit.unitId} className="flex items-center gap-4 border-b border-border px-4 py-3 text-sm last:border-b-0">
                  <span className="min-w-32 font-medium">{unit.unitName} ({unit.unitSymbol})</span>
                  <span className="flex-1 text-muted-foreground">1 {unit.unitSymbol} = {unit.conversionFactor ?? '1'} {baseSymbol}</span>
                  <span className="text-xs">{unit.allowedForPurchase ? 'Purchase' : ''}{unit.allowedForPurchase && unit.allowedForSale ? ' · ' : ''}{unit.allowedForSale ? 'Sale' : ''}</span>
                </div>
              )) : <p className="p-4 text-sm text-muted-foreground">No unit conversions configured.</p>}
            </div>
          )}
          {!canManage && <p className="text-xs text-muted-foreground">Only Org Admin or Super Admin can change unit conversions.</p>}
        </section>
      </div>
    </FormDrawer>
  );
}
