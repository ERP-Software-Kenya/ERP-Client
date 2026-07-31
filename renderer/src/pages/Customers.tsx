import { useState } from 'react';
import { toast } from 'sonner';
import { FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Customers } from '../api';

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

/**
 * Create is impossible until Core API sets organizationId from auth
 * (create-customer.command has no org field; customers.controller has no @CurrentUser).
 * Lookup still works for rows already in the DB.
 */
export default function CustomersPage() {
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const { data: lookedUp, isLoading, error } = Customers.useGet(activeId);

  const loadCustomer = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter a customer UUID');
      return;
    }
    setActiveId(trimmed);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Get-by-UUID works. No list endpoint. Create is blocked by Core API (verified in{' '}
            <code className="text-xs">core-apis</code> source).
          </p>
        </div>
        <Button variant="outline" disabled title="Blocked by Core API #8">
          New Customer (blocked)
        </Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
        Verified against <code className="text-xs">CreateCustomerCommand</code> /{' '}
        <code className="text-xs">customer.entity.ts</code>: <code className="text-xs">organizationId</code> is
        NOT NULL and never set (no auth injection on controller). Client cannot work around this — sending
        org in the body is ignored. Paste an existing customer UUID for Orders/POS when available.
      </div>

      <FormSection title="Look up customer">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Customer UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadCustomer}>
            Load
          </Button>
        </div>
      </FormSection>

      {activeId && (
        <FormSection title="Customer">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error || !lookedUp ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Customer not found.'}
            </p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">Name:</span> {lookedUp.name ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {lookedUp.email ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span> {lookedUp.phone ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">GSTIN:</span> {lookedUp.gstin ?? '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}
    </div>
  );
}
