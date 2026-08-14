import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BillingSettings } from '../../api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormSection } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { CustomerType, CustomerTypeRule, QuickCharge } from '../../types';

const TYPE_LABEL: Record<CustomerType, string> = {
  regular: 'Regular',
  new: 'New',
  shop: 'Shop',
  big_customer: 'Big Customer',
};

export default function BillingSettingsPage(): React.JSX.Element {
  const { data: charges = [], isLoading: chargesLoading } = BillingSettings.useQuickCharges();
  const { data: rules = [], isLoading: rulesLoading } = BillingSettings.useCustomerTypeRules();
  const createCharge = BillingSettings.useCreateQuickCharge();
  const updateCharge = BillingSettings.useUpdateQuickCharge();
  const deleteCharge = BillingSettings.useDeleteQuickCharge();
  const updateRule = BillingSettings.useUpdateCustomerTypeRule();

  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<QuickCharge | null>(null);

  const handleAddCharge = (ev: React.FormEvent): void => {
    ev.preventDefault();
    const label = newLabel.trim();
    const amount = Number(newAmount);
    if (!label || Number.isNaN(amount)) return;
    createCharge.mutate(
      { label, amount, sortOrder: charges.length },
      {
        onSuccess: () => {
          setNewLabel('');
          setNewAmount('');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Quick charges and customer-type price/credit defaults.</p>
      </div>

      <FormSection title="Quick Charges">
        <p className="mb-3 text-xs text-muted-foreground">
          Enabled charges appear on Sales POS. Amount can be negative (discount / credit).
        </p>
        {chargesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {charges.map((c) => (
              <QuickChargeRow
                key={c.id}
                charge={c}
                saving={updateCharge.isPending}
                onSave={(body) => updateCharge.mutate({ id: c.id, body })}
                onDelete={() => setDeleteTarget(c)}
              />
            ))}
            {charges.length === 0 && (
              <p className="text-sm text-muted-foreground">No charges yet. Add one below.</p>
            )}
          </div>
        )}
        <form onSubmit={handleAddCharge} className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Name</label>
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Delivery Fee" />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="200"
            />
          </div>
          <Button type="submit" disabled={createCharge.isPending || !newLabel.trim()}>
            <Plus size={14} className="mr-1" />
            Add
          </Button>
        </form>
      </FormSection>

      <FormSection title="Customer type defaults">
        <p className="mb-3 text-xs text-muted-foreground">
          Discount applies to new POS lines. Skip approval lets over-limit credit complete without a request. Per-customer
          overrides on the customer form beat these rows.
        </p>
        {rulesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Discount %</th>
                  <th className="py-2 pr-3 font-medium">Default credit limit</th>
                  <th className="py-2 font-medium">Skip over-limit approval</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <TypeRuleRow
                    key={rule.id}
                    rule={rule}
                    saving={updateRule.isPending}
                    onSave={(body) => updateRule.mutate({ id: rule.id, body })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Remove quick charge?"
        description={deleteTarget ? `Remove “${deleteTarget.label}” from POS quick charges.` : ''}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCharge.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        isPending={deleteCharge.isPending}
      />
    </div>
  );
}

function QuickChargeRow({
  charge,
  saving,
  onSave,
  onDelete,
}: {
  charge: QuickCharge;
  saving: boolean;
  onSave: (body: Partial<QuickCharge>) => void;
  onDelete: () => void;
}): React.JSX.Element {
  const [label, setLabel] = useState(charge.label);
  const [amount, setAmount] = useState(String(charge.amount));

  const persist = (): void => {
    const nextAmount = Number(amount);
    const patch: Partial<QuickCharge> = {};
    if (label.trim() && label.trim() !== charge.label) patch.label = label.trim();
    if (!Number.isNaN(nextAmount) && nextAmount !== Number(charge.amount)) patch.amount = nextAmount;
    if (Object.keys(patch).length) onSave(patch);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
      <Input className="min-w-[10rem] flex-1" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={persist} disabled={saving} />
      <Input className="w-28" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={persist} disabled={saving} />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={charge.enabled}
          onChange={(e) => onSave({ enabled: e.target.checked })}
          disabled={saving}
        />
        Enabled
      </label>
      <Button type="button" variant="outline" size="sm" onClick={onDelete}>
        <Trash2 size={14} />
      </Button>
    </div>
  );
}

function TypeRuleRow({
  rule,
  saving,
  onSave,
}: {
  rule: CustomerTypeRule;
  saving: boolean;
  onSave: (body: Partial<CustomerTypeRule>) => void;
}): React.JSX.Element {
  const [discount, setDiscount] = useState(String(rule.discountPercent ?? 0));
  const [limit, setLimit] = useState(rule.defaultCreditLimit != null ? String(rule.defaultCreditLimit) : '');
  const typeLabel = TYPE_LABEL[rule.customerType as CustomerType] ?? String(rule.customerType);

  return (
    <tr className="border-b border-border/60">
      <td className="py-2 pr-3 font-medium">{typeLabel}</td>
      <td className="py-2 pr-3">
        <Input
          className="w-24"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={discount}
          disabled={saving}
          onChange={(e) => setDiscount(e.target.value)}
          onBlur={() => {
            const n = Number(discount);
            if (Number.isNaN(n) || n === Number(rule.discountPercent)) return;
            onSave({ discountPercent: Math.min(100, Math.max(0, n)) });
          }}
        />
      </td>
      <td className="py-2 pr-3">
        <Input
          className="w-36"
          type="number"
          min="0"
          step="0.01"
          placeholder="None"
          value={limit}
          disabled={saving}
          onChange={(e) => setLimit(e.target.value)}
          onBlur={() => {
            const trimmed = limit.trim();
            const next = trimmed === '' ? null : Number(trimmed);
            if (trimmed !== '' && Number.isNaN(next as number)) return;
            if (next === (rule.defaultCreditLimit ?? null)) return;
            onSave({ defaultCreditLimit: next });
          }}
        />
      </td>
      <td className="py-2">
        <input
          type="checkbox"
          checked={rule.skipOverLimitApproval}
          disabled={saving}
          onChange={(e) => onSave({ skipOverLimitApproval: e.target.checked })}
        />
      </td>
    </tr>
  );
}
