import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Save } from 'lucide-react';
import { EmailNotificationSettings } from '../../api';
import { FormSection } from '../../components/FormDrawer';
import { Button } from '../../components/ui/button';

type ToggleState = Record<string, boolean>;

type EventDef = { key: string; label: string; desc: string };
type EventGroup = { key: string; label: string; events: EventDef[] };

const EVENT_GROUPS: EventGroup[] = [
  {
    key: 'auth', label: 'Authentication',
    events: [
      { key: 'auth.login',        label: 'User signed in',   desc: 'Any user signs into the organization' },
      { key: 'auth.logout',       label: 'User signed out',  desc: 'A session ended or expired' },
      { key: 'auth.login_failed', label: 'Failed sign-in',   desc: 'Sign-in attempt rejected' },
    ],
  },
  {
    key: 'product', label: 'Products',
    events: [
      { key: 'product.created',       label: 'Product created',   desc: 'New product added to catalogue' },
      { key: 'product.updated',       label: 'Product updated',   desc: 'Details or specs changed' },
      { key: 'product.price_changed', label: 'Price changed',     desc: 'Selling or cost price updated' },
      { key: 'product.enabled',       label: 'Product enabled',   desc: 'Product made available for sale' },
      { key: 'product.disabled',      label: 'Product disabled',  desc: 'Product removed from sale' },
      { key: 'product.deleted',       label: 'Product deleted',   desc: 'Product removed from catalogue' },
    ],
  },
  {
    key: 'stock', label: 'Stock',
    events: [
      { key: 'stock.added',                label: 'Stock added',            desc: 'Inventory received or restocked' },
      { key: 'stock.removed',              label: 'Stock removed',          desc: 'Units removed from inventory' },
      { key: 'stock.adjusted',             label: 'Stock adjusted',         desc: 'Manual stock count correction' },
      { key: 'stock.transferred',          label: 'Stock transferred',      desc: 'Moved between branches or locations' },
      { key: 'stock.damaged',              label: 'Stock damaged',          desc: 'Units marked as damaged' },
      { key: 'stock.written_off',          label: 'Stock written off',      desc: 'Units written off as loss' },
      { key: 'stock.reserved',             label: 'Stock reserved',         desc: 'Units held for an order' },
      { key: 'stock.reservation_released', label: 'Reservation released',   desc: 'Reserved units returned to stock' },
    ],
  },
  {
    key: 'sale', label: 'Sales',
    events: [
      { key: 'sale.created',          label: 'Sale created',       desc: 'New sale order placed' },
      { key: 'sale.confirmed',        label: 'Sale confirmed',     desc: 'Order confirmed and scheduled' },
      { key: 'sale.payment_received', label: 'Payment received',   desc: 'Customer payment recorded' },
      { key: 'sale.refunded',         label: 'Sale refunded',      desc: 'Refund issued to customer' },
      { key: 'sale.voided',           label: 'Sale voided',        desc: 'Sale cancelled before fulfilment' },
    ],
  },
  {
    key: 'purchase_order', label: 'Purchase orders',
    events: [
      { key: 'purchase_order.created',        label: 'PO created',           desc: 'New purchase order raised' },
      { key: 'purchase_order.sent',           label: 'PO sent to supplier',  desc: 'Order dispatched to supplier' },
      { key: 'purchase_order.goods_received', label: 'Goods received',       desc: 'Delivery confirmed and stocked' },
      { key: 'purchase_order.cancelled',      label: 'PO cancelled',         desc: 'Purchase order called off' },
    ],
  },
  {
    key: 'invoice', label: 'Invoices',
    events: [
      { key: 'invoice.created', label: 'Invoice created', desc: 'New invoice generated' },
      { key: 'invoice.sent',    label: 'Invoice sent',    desc: 'Invoice delivered to customer' },
      { key: 'invoice.paid',    label: 'Invoice paid',    desc: 'Payment confirmed against invoice' },
      { key: 'invoice.voided',  label: 'Invoice voided',  desc: 'Invoice cancelled' },
    ],
  },
  {
    key: 'bill', label: 'Bills',
    events: [
      { key: 'bill.created', label: 'Bill created', desc: 'Supplier bill recorded' },
      { key: 'bill.paid',    label: 'Bill paid',    desc: 'Payment made to supplier' },
    ],
  },
  {
    key: 'customer', label: 'Customers',
    events: [
      { key: 'customer.created',              label: 'Customer created',      desc: 'New customer account opened' },
      { key: 'customer.updated',              label: 'Customer updated',      desc: 'Customer profile changed' },
      { key: 'customer.credit_limit_changed', label: 'Credit limit changed',  desc: 'Credit ceiling adjusted' },
      { key: 'customer.deactivated',          label: 'Customer deactivated',  desc: 'Account suspended' },
    ],
  },
  {
    key: 'supplier', label: 'Suppliers',
    events: [
      { key: 'supplier.created',     label: 'Supplier created',     desc: 'New supplier onboarded' },
      { key: 'supplier.updated',     label: 'Supplier updated',     desc: 'Supplier profile changed' },
      { key: 'supplier.deactivated', label: 'Supplier deactivated', desc: 'Supplier account suspended' },
    ],
  },
  {
    key: 'user', label: 'Users',
    events: [
      { key: 'user.created',      label: 'User invited',     desc: 'New member added to organization' },
      { key: 'user.updated',      label: 'User updated',     desc: 'Profile or settings changed' },
      { key: 'user.role_changed', label: 'Role changed',     desc: 'Permissions updated for a user' },
      { key: 'user.deactivated',  label: 'User deactivated', desc: 'Account access revoked' },
      { key: 'user.reactivated',  label: 'User reactivated', desc: 'Account access restored' },
    ],
  },
  {
    key: 'branch', label: 'Branches',
    events: [
      { key: 'branch.created', label: 'Branch created', desc: 'New branch or location added' },
      { key: 'branch.updated', label: 'Branch updated', desc: 'Branch details changed' },
    ],
  },
  {
    key: 'report', label: 'Reports',
    events: [
      { key: 'report.generated', label: 'Report generated', desc: 'Scheduled or manual report completed' },
      { key: 'report.exported',  label: 'Report exported',  desc: 'Report downloaded as file' },
    ],
  },
  {
    key: 'org', label: 'Organization',
    events: [
      { key: 'org.settings_updated', label: 'Settings updated', desc: 'Organization-wide setting changed' },
      { key: 'org.module_toggled',   label: 'Module toggled',   desc: 'Feature module enabled or disabled' },
      { key: 'org.billing_changed',  label: 'Billing changed',  desc: 'Subscription or billing updated' },
    ],
  },
];

const TOTAL_EVENTS = EVENT_GROUPS.reduce((acc, g) => acc + g.events.length, 0);

function buildBase(): ToggleState {
  const map: ToggleState = {};
  EVENT_GROUPS.forEach(g => g.events.forEach(e => { map[e.key] = false; }));
  return map;
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }): React.JSX.Element {
  return (
    <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className={`block h-5 w-9 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-200'} ${disabled === true ? 'cursor-not-allowed opacity-50' : ''}`} />
      <span
        className="pointer-events-none absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
        style={{ left: checked ? '18px' : '2px', transition: 'left 0.15s' }}
      />
    </label>
  );
}

interface Props { isOrgAdmin: boolean }

export function EmailNotificationsSection({ isOrgAdmin }: Props): React.JSX.Element {
  const { data: settings, isLoading } = EmailNotificationSettings.useGet();
  const upsert = EmailNotificationSettings.useUpsert();

  const [local, setLocal] = useState<ToggleState>(buildBase);
  const [saved, setSaved] = useState<ToggleState>(buildBase);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const base = buildBase();
    if (settings) settings.forEach(s => { base[s.event] = s.isEnabled; });
    setLocal({ ...base });
    setSaved({ ...base });
  }, [settings]);

  const isDirty = Object.keys(local).some(k => local[k] !== saved[k]);
  const enabledCount = Object.values(local).filter(Boolean).length;

  const handleToggle = useCallback((key: string, val: boolean): void => {
    setLocal(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleGroup = useCallback((key: string): void => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const setGroupAll = useCallback((group: EventGroup, val: boolean): void => {
    setLocal(prev => {
      const next = { ...prev };
      group.events.forEach(e => { next[e.key] = val; });
      return next;
    });
  }, []);

  const handleSave = (): void => {
    const items = Object.entries(local).map(([event, isEnabled]) => ({ event, isEnabled }));
    upsert.mutate(items, { onSuccess: () => setSaved({ ...local }) });
  };

  const handleDiscard = (): void => { setLocal({ ...saved }); };

  return (
    <FormSection>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Email notifications — OrgAdmin
        </p>
        <span className="text-xs text-muted-foreground">{enabledCount} of {TOTAL_EVENTS} enabled</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Choose which actions send an email to all active Organization Admins. Applies to your entire organization.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {EVENT_GROUPS.map(group => {
            const isOpen = openGroups.has(group.key);
            const enabledInGroup = group.events.filter(e => local[e.key]).length;
            const allOn = enabledInGroup === group.events.length;

            return (
              <div key={group.key}>
                <div
                  className="flex cursor-pointer select-none items-center justify-between px-3 py-2.5 hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroup(group.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleGroup(group.key); }}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      size={13}
                      className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                    <span className="text-sm font-medium">{group.label}</span>
                    <span className="rounded-full border border-border bg-muted px-1.5 text-[11px] text-muted-foreground">
                      {group.events.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {enabledInGroup > 0 && (
                      <span className="text-[11px] font-medium text-primary">{enabledInGroup} on</span>
                    )}
                    {isOrgAdmin && (
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); setGroupAll(group, !allOn); }}
                      >
                        {allOn ? 'Disable all' : 'Enable all'}
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border">
                    {group.events.map(ev => (
                      <div
                        key={ev.key}
                        className="flex items-center justify-between border-b border-border px-3 py-2 pl-8 last:border-b-0 hover:bg-muted/20"
                      >
                        <div>
                          <p className="text-sm">{ev.label}</p>
                          <p className="text-xs text-muted-foreground">{ev.desc}</p>
                        </div>
                        <ToggleSwitch
                          checked={local[ev.key] ?? false}
                          onChange={(val) => handleToggle(ev.key, val)}
                          disabled={!isOrgAdmin}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOrgAdmin && (
        <div className="flex items-center justify-end gap-3 pt-1">
          {isDirty && (
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={handleDiscard}
            >
              Discard
            </button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || upsert.isPending}
          >
            <Save size={14} className="mr-1.5" />
            {upsert.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    </FormSection>
  );
}
