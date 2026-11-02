import { useState } from 'react';
import { Plus, Pencil, Trash2, Ruler } from 'lucide-react';
import { OrganizationUnits } from '../../api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormDrawer, Field } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { OrganizationUnit } from '../../types';

interface UnitForm {
  name: string;
  symbol: string;
  quantityPrecision: string;
  allowFraction: boolean;
  roundingMode: 'nearest' | 'up' | 'down';
  minimumQuantity: string;
  quantityIncrement: string;
  isActive: boolean;
  sortOrder: string;
}

const EMPTY_FORM: UnitForm = {
  name: '',
  symbol: '',
  quantityPrecision: '4',
  allowFraction: true,
  roundingMode: 'nearest',
  minimumQuantity: '',
  quantityIncrement: '1',
  isActive: true,
  sortOrder: '0',
};

export default function OrganizationUnitsPage() {
  const { data: units = [], isLoading } = OrganizationUnits.useList();
  const createMutation = OrganizationUnits.useCreate();
  const updateMutation = OrganizationUnits.useUpdate();
  const deleteMutation = OrganizationUnits.useDelete();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem,   setEditItem]   = useState<OrganizationUnit | null>(null);
  const [deleteItem, setDeleteItem] = useState<OrganizationUnit | null>(null);
  const [form, setForm]             = useState<UnitForm>(EMPTY_FORM);

  const openCreate = () => { setForm(EMPTY_FORM); setCreateOpen(true); };
  const openEdit   = (u: OrganizationUnit) => {
    setEditItem(u);
    setForm({
      name: u.name,
      symbol: u.symbol,
      quantityPrecision: String(u.quantityPrecision ?? 4),
      allowFraction: u.allowFraction ?? true,
      roundingMode: u.roundingMode ?? 'nearest',
      minimumQuantity: u.minimumQuantity ?? '',
      quantityIncrement: u.quantityIncrement ?? '1',
      isActive: u.isActive,
      sortOrder: String(u.sortOrder),
    });
  };

  const quantityRules = () => ({
    quantityPrecision: Number(form.quantityPrecision),
    allowFraction: form.allowFraction,
    roundingMode: form.roundingMode,
    minimumQuantity: form.minimumQuantity || null,
    quantityIncrement: form.quantityIncrement,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.symbol.trim()) return;
    await createMutation.mutateAsync({
      name:      form.name.trim(),
      symbol:    form.symbol.trim(),
      ...quantityRules(),
      isActive:  form.isActive,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : 0,
    } as Partial<OrganizationUnit>);
    setCreateOpen(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !form.name.trim() || !form.symbol.trim()) return;
    await updateMutation.mutateAsync({
      id: editItem.id,
      body: {
        name:      form.name.trim(),
        symbol:    form.symbol.trim(),
        ...quantityRules(),
        isActive:  form.isActive,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : 0,
      } as Partial<OrganizationUnit>,
    });
    setEditItem(null);
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteMutation.mutate(deleteItem.id, { onSuccess: () => setDeleteItem(null) });
  };

  const sorted = [...units].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Units</h1>
          <p className="text-sm text-muted-foreground">Units of measure available across your organization (kg, piece, litre, etc.)</p>
        </div>
        <Button onClick={openCreate}><Plus size={15} /> Add Unit</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 flex flex-col items-center gap-3 text-center">
          <Ruler size={32} className="text-muted-foreground/50" />
          <p className="font-medium">No units yet</p>
          <p className="text-sm text-muted-foreground">Add units of measure (kg, piece, litre) that products in your organization will use.</p>
          <Button variant="outline" onClick={openCreate}><Plus size={14} /> Add first unit</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {sorted.map((unit, idx) => (
            <div
              key={unit.id}
              className={[
                'flex items-center gap-4 px-4 py-3',
                idx < sorted.length - 1 ? 'border-b border-border' : '',
                !unit.isActive ? 'opacity-50' : '',
              ].join(' ')}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{unit.symbol}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{unit.name}</p>
                <p className="text-xs text-muted-foreground">
                  Symbol: {unit.symbol} · Increment: {unit.quantityIncrement ?? '1'} · Precision: {unit.quantityPrecision ?? 4} · Order: {unit.sortOrder}
                </p>
              </div>
              <span className={[
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                unit.isActive
                  ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400'
                  : 'bg-muted text-muted-foreground border-border',
              ].join(' ')}>
                {unit.isActive ? 'Active' : 'Inactive'}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(unit)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteItem(unit)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create drawer */}
      <FormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Unit"
        subtitle="Define a new unit of measure for your organization"
        footer={
          <>
            <Button type="submit" form="unit-create-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding…' : 'Add Unit'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </>
        }
      >
        <form id="unit-create-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Name" required>
            <Input placeholder="e.g. Kilogram" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </Field>
          <Field label="Symbol" required>
            <Input placeholder="e.g. kg" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} />
          </Field>
          <QuantityRulesFields form={form} setForm={setForm} />
          <Field label="Sort Order" hint="Lower numbers appear first">
            <Input type="number" min="0" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
            <span className="text-sm">Active</span>
          </label>
        </form>
      </FormDrawer>

      {/* Edit drawer */}
      {editItem && (
        <FormDrawer
          open
          onClose={() => setEditItem(null)}
          title="Edit Unit"
          subtitle={editItem.name}
          footer={
            <>
              <Button type="submit" form="unit-edit-form" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            </>
          }
        >
          <form id="unit-edit-form" onSubmit={handleUpdate} className="space-y-4">
            <Field label="Name" required>
              <Input placeholder="e.g. Kilogram" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </Field>
            <Field label="Symbol" required>
              <Input placeholder="e.g. kg" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} />
            </Field>
            <QuantityRulesFields form={form} setForm={setForm} />
            <Field label="Sort Order" hint="Lower numbers appear first">
              <Input type="number" min="0" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
              <span className="text-sm">Active</span>
            </label>
          </form>
        </FormDrawer>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteItem)}
        onOpenChange={open => { if (!open) setDeleteItem(null); }}
        title="Delete unit?"
        description={`Remove "${deleteItem?.name}" (${deleteItem?.symbol}) from your organization. If it is already used by products or inventory, it will be retired instead so historical records remain valid.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function QuantityRulesFields({ form, setForm }: { form: UnitForm; setForm: React.Dispatch<React.SetStateAction<UnitForm>> }) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">Quantity rules</p>
        <p className="text-xs text-muted-foreground">Controls how users may enter this unit. Product conversion is configured separately.</p>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.allowFraction}
          onChange={e => setForm(f => ({
            ...f,
            allowFraction: e.target.checked,
            quantityPrecision: e.target.checked ? (f.quantityPrecision === '0' ? '4' : f.quantityPrecision) : '0',
            quantityIncrement: e.target.checked ? f.quantityIncrement : '1',
          }))}
          className="h-4 w-4 rounded accent-primary"
        />
        <span className="text-sm">Allow fractional quantities</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Decimal precision" hint="Between 0 and 8">
          <Input
            type="number"
            min="0"
            max="8"
            step="1"
            disabled={!form.allowFraction}
            value={form.quantityPrecision}
            onChange={e => setForm(f => ({ ...f, quantityPrecision: e.target.value }))}
          />
        </Field>
        <Field label="Quantity increment" hint="Example: 0.25 or 1">
          <Input
            inputMode="decimal"
            required
            value={form.quantityIncrement}
            onChange={e => setForm(f => ({ ...f, quantityIncrement: e.target.value }))}
          />
        </Field>
        <Field label="Minimum quantity" hint="Optional">
          <Input
            inputMode="decimal"
            value={form.minimumQuantity}
            onChange={e => setForm(f => ({ ...f, minimumQuantity: e.target.value }))}
          />
        </Field>
        <Field label="Rounding mode">
          <select
            value={form.roundingMode}
            onChange={e => setForm(f => ({ ...f, roundingMode: e.target.value as UnitForm['roundingMode'] }))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="nearest">Nearest</option>
            <option value="up">Always up</option>
            <option value="down">Always down</option>
          </select>
        </Field>
      </div>
    </div>
  );
}
