import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import type { OrganizationUnit, ProductUnitConfiguration } from '../../../types';

export type ProductUnitDraft = ProductUnitConfiguration;

interface Props {
  availableUnits: OrganizationUnit[];
  units: ProductUnitDraft[];
  onChange: (units: ProductUnitDraft[]) => void;
  baseUnitId: string;
  onBaseUnitChange: (id: string) => void;
  defaultSaleUnitId: string;
  onDefaultSaleUnitChange: (id: string) => void;
  defaultPurchaseUnitId: string;
  onDefaultPurchaseUnitChange: (id: string) => void;
}

export function ProductUnitConversionEditor(props: Props) {
  const selected = new Set(props.units.map((unit) => unit.unitId));
  const remaining = props.availableUnits.filter((unit) => !selected.has(unit.id));

  const addUnit = (unitId: string) => {
    if (!unitId) return;
    const next = [...props.units, {
      unitId,
      conversionFactor: props.units.length ? '' : '1',
      allowedForSale: true,
      allowedForPurchase: true,
      isActive: true,
    }];
    props.onChange(next);
    if (!props.baseUnitId) {
      props.onBaseUnitChange(unitId);
      props.onDefaultSaleUnitChange(unitId);
      props.onDefaultPurchaseUnitChange(unitId);
    }
  };

  const updateUnit = (unitId: string, patch: Partial<ProductUnitDraft>) => {
    props.onChange(props.units.map((unit) => unit.unitId === unitId ? { ...unit, ...patch } : unit));
  };

  const removeUnit = (unitId: string) => {
    if (unitId === props.baseUnitId) return;
    props.onChange(props.units.filter((unit) => unit.unitId !== unitId));
    if (props.defaultSaleUnitId === unitId) props.onDefaultSaleUnitChange(props.baseUnitId);
    if (props.defaultPurchaseUnitId === unitId) props.onDefaultPurchaseUnitChange(props.baseUnitId);
  };

  const setBase = (unitId: string) => {
    props.onBaseUnitChange(unitId);
    updateUnit(unitId, { conversionFactor: '1', isActive: true });
    if (!props.defaultSaleUnitId) props.onDefaultSaleUnitChange(unitId);
    if (!props.defaultPurchaseUnitId) props.onDefaultPurchaseUnitChange(unitId);
  };

  const saleUnits = props.units.filter((unit) => unit.allowedForSale && unit.isActive);
  const purchaseUnits = props.units.filter((unit) => unit.allowedForPurchase && unit.isActive);

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-semibold">Units and conversions</p>
        <p className="text-xs text-muted-foreground">Choose one inventory base unit, then define how each additional unit converts to it.</p>
      </div>

      {props.units.map((item) => {
        const catalogUnit = props.availableUnits.find((unit) => unit.id === item.unitId);
        const isBase = item.unitId === props.baseUnitId;
        return (
          <div key={item.unitId} className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-3">
              <label className="flex min-w-36 items-center gap-2 text-sm font-medium">
                <input type="radio" name="base-unit" checked={isBase} onChange={() => setBase(item.unitId)} />
                {catalogUnit?.name ?? item.unitId} ({catalogUnit?.symbol ?? '?'})
              </label>
              <div className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
                <span>1 {catalogUnit?.symbol ?? 'unit'} =</span>
                <Input
                  inputMode="decimal"
                  value={item.conversionFactor}
                  disabled={isBase}
                  onChange={(event) => updateUnit(item.unitId, { conversionFactor: event.target.value })}
                  className="h-8 max-w-32"
                  placeholder="e.g. 10"
                />
                <span>{props.availableUnits.find((unit) => unit.id === props.baseUnitId)?.symbol ?? 'base units'}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" disabled={isBase} onClick={() => removeUnit(item.unitId)} aria-label="Remove unit">
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" checked={item.allowedForSale} onChange={(e) => updateUnit(item.unitId, { allowedForSale: e.target.checked })} /> Allow sales</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={item.allowedForPurchase} onChange={(e) => updateUnit(item.unitId, { allowedForPurchase: e.target.checked })} /> Allow purchases</label>
              <Input value={item.barcode ?? ''} onChange={(e) => updateUnit(item.unitId, { barcode: e.target.value || undefined })} className="h-8 max-w-48" placeholder="Optional unit barcode" />
              {isBase && <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">Base inventory unit</span>}
            </div>
          </div>
        );
      })}

      {remaining.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <Plus size={14} />
          <select className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm" value="" onChange={(event) => addUnit(event.target.value)}>
            <option value="">Add another unit…</option>
            {remaining.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}
          </select>
        </label>
      )}

      {props.units.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-medium">Default sales unit
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" value={props.defaultSaleUnitId} onChange={(e) => props.onDefaultSaleUnitChange(e.target.value)}>
              {saleUnits.map((unit) => <option key={unit.unitId} value={unit.unitId}>{props.availableUnits.find((item) => item.id === unit.unitId)?.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">Default purchase unit
            <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" value={props.defaultPurchaseUnitId} onChange={(e) => props.onDefaultPurchaseUnitChange(e.target.value)}>
              {purchaseUnits.map((unit) => <option key={unit.unitId} value={unit.unitId}>{props.availableUnits.find((item) => item.id === unit.unitId)?.name}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
