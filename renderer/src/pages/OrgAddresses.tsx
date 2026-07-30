import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface FormState {
  organizationId: string;
  type: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isPrimary: string;
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  type: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  isPrimary: 'false',
};

export default function OrgAddressesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Organization address API is unavailable — nothing was saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Organization Addresses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Addresses linked to organizations. No backend endpoints exist for this resource.
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }} variant="outline">
          View form (unavailable)
        </Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        No org-addresses API in core-apis — there is no list, create, update, or delete. Save is
        disabled.
      </div>

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="Add Address"
        footer={
          <>
            <Button type="submit" form="org-address-form" disabled>
              Save (API unavailable)
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="org-address-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Submitting is disabled — no backend endpoints for organization addresses.
          </div>
          <Field label="Organization ID">
            <Input
              value={form.organizationId}
              onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
              placeholder="UUID"
              disabled
            />
          </Field>
          <Field label="Type">
            <Input
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="e.g. billing, shipping"
              disabled
            />
          </Field>
          <Field label="Address Line 1">
            <Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} disabled />
          </Field>
          <Field label="Address Line 2">
            <Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} disabled />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} disabled />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Country">
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} disabled />
            </Field>
            <Field label="Postal Code">
              <Input
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                disabled
              />
            </Field>
          </div>
          <Field label="Primary Address">
            <Select value={form.isPrimary} onValueChange={(v) => setForm({ ...form, isPrimary: v })} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
