import { useEffect, useState } from 'react';
import { CalendarRange, Globe2, Plus, Save, Trash2, WalletCards } from 'lucide-react';
import { BillingSettings } from '../../api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SettingSection } from '../../components/SettingSection';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { CustomerType, CustomerTypeRule, QuickCharge } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import { configureCurrencyCode, getCurrencySymbol } from '../../lib/format-money';

const CURRENCIES = ['USD', 'KES', 'INR', 'EUR', 'GBP', 'AED', 'TZS', 'UGX', 'ZAR', 'CAD', 'AUD'] as const;
const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2024, index, 1)),
);
const TIME_ZONES = ['UTC', 'Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York'];

const TYPE_LABEL: Record<CustomerType, string> = {
  regular: 'Regular',
  new: 'New',
  shop: 'Shop',
  big_customer: 'Big Customer',
};

export default function BillingSettingsPage(): React.JSX.Element {
  const { refresh: refreshAuth } = useAuth();
  const { isOrgAdmin } = useSession();
  const { data: organizationSettings, isLoading: settingsLoading, error: settingsError } = BillingSettings.useOrganizationSettings();
  const updateOrganizationSettings = BillingSettings.useUpdateOrganizationSettings();
  const { data: charges = [], isLoading: chargesLoading } = BillingSettings.useQuickCharges();
  const { data: rules = [], isLoading: rulesLoading } = BillingSettings.useCustomerTypeRules();
  const createCharge = BillingSettings.useCreateQuickCharge();
  const updateCharge = BillingSettings.useUpdateQuickCharge();
  const deleteCharge = BillingSettings.useDeleteQuickCharge();
  const updateRule = BillingSettings.useUpdateCustomerTypeRule();

  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<QuickCharge | null>(null);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(4);
  const [timeZone, setTimeZone] = useState('UTC');

  useEffect(() => {
    if (!organizationSettings) return;
    setCurrencyCode(organizationSettings.baseCurrencyCode);
    setFiscalYearStartMonth(organizationSettings.fiscalYearStartMonth);
    setTimeZone(organizationSettings.timeZone);
  }, [organizationSettings]);

  const saveOrganizationSettings = (): void => {
    updateOrganizationSettings.mutate(
      { baseCurrencyCode: currencyCode, fiscalYearStartMonth, timeZone },
      {
        onSuccess: async (settings) => {
          configureCurrencyCode(settings.baseCurrencyCode);
          await refreshAuth();
        },
      },
    );
  };

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
    <div className="px-6 py-6">
      <div className="mb-2">
        <h1 className="text-xl font-semibold">Financial settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization currency, fiscal calendar, regional settings, and billing defaults.
        </p>
      </div>

      <div className="divide-y divide-border">
        <SettingSection
          title="Organization finance"
          description="Base currency, fiscal year start month, and time zone used across all reports and documents."
        >
          {settingsLoading ? (
            <p className="text-sm text-muted-foreground">Loading organization settings…</p>
          ) : settingsError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Unable to load organization settings. Confirm that your account has organization-admin access and try again.
            </p>
          ) : (
            <div className="space-y-5 rounded-lg border border-border bg-card p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1.5 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <WalletCards size={14} /> Base currency
                  </span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={currencyCode}
                    onChange={(event) => setCurrencyCode(event.target.value)}
                    disabled={!isOrgAdmin}
                  >
                    {[...new Set([currencyCode, ...CURRENCIES])].map((code) => (
                      <option key={code} value={code}>
                        {code} ({getCurrencySymbol(code)})
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs text-muted-foreground">
                    Used for every amount, document, and report.
                  </span>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <CalendarRange size={14} /> Fiscal year starts
                  </span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={fiscalYearStartMonth}
                    onChange={(event) => setFiscalYearStartMonth(Number(event.target.value))}
                    disabled={!isOrgAdmin}
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <Globe2 size={14} /> Time zone
                  </span>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={timeZone}
                    onChange={(event) => setTimeZone(event.target.value)}
                    disabled={!isOrgAdmin}
                  >
                    {[...new Set([timeZone, ...TIME_ZONES])].map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isOrgAdmin ? (
                <div className="flex justify-end border-t border-border pt-3">
                  <Button
                    type="button"
                    onClick={saveOrganizationSettings}
                    disabled={updateOrganizationSettings.isPending || !organizationSettings}
                  >
                    <Save size={14} />
                    {updateOrganizationSettings.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Only organization administrators can change these settings.
                </p>
              )}
            </div>
          )}
        </SettingSection>

        <SettingSection
          title="Quick charges"
          description="Preset amounts shown on the Sales POS screen. Negative values act as discounts."
        >
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            {chargesLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                {charges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No charges yet. Add one below.</p>
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
                  </div>
                )}

                <form
                  onSubmit={handleAddCharge}
                  className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
                >
                  <div className="min-w-[10rem] flex-1">
                    <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                    <Input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Delivery Fee"
                    />
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
                    <Plus size={14} />
                    Add
                  </Button>
                </form>
              </>
            )}
          </div>
        </SettingSection>

        <SettingSection
          title="Customer type defaults"
          description="Default discount and credit rules per customer type. Per-customer overrides on the customer form take precedence."
        >
          <div className="rounded-lg border border-border bg-card">
            {rulesLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Discount %</th>
                      <th className="px-4 py-2.5 font-medium">Default credit limit</th>
                      <th className="px-4 py-2.5 font-medium">Skip over-limit approval</th>
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
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Discount applies to new POS lines. Skip approval lets over-limit credit complete without a request.
            </p>
          </div>
        </SettingSection>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remove quick charge?"
        description={deleteTarget ? `Remove "${deleteTarget.label}" from POS quick charges.` : ''}
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
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 p-2">
      <Input
        className="min-w-[10rem] flex-1"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={persist}
        disabled={saving}
      />
      <Input
        className="w-28"
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={persist}
        disabled={saving}
      />
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
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="px-4 py-2.5 font-medium">{typeLabel}</td>
      <td className="px-4 py-2.5">
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
      <td className="px-4 py-2.5">
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
      <td className="px-4 py-2.5">
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
