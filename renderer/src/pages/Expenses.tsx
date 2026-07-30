import { useState } from 'react';
import { toast } from 'sonner';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { Expenses, Organizations, Stores } from '../api';
import type { Expense } from '../types';

interface FormState {
  organizationId: string;
  storeId: string;
  category: string;
  amount: string;
  expenseDate: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  storeId: '',
  category: '',
  amount: '',
  expenseDate: '',
  description: '',
};

export default function ExpensesPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Expense | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const createMutation = Expenses.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = Expenses.useGet(activeId);

  const closeDrawer = () => setDrawerOpen(false);

  const loadLookup = () => {
    const trimmed = lookupId.trim();
    if (!trimmed) {
      toast.error('Enter an expense UUID');
      return;
    }
    setActiveId(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        organizationId: form.organizationId || undefined,
        storeId: form.storeId || undefined,
        category: form.category || undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        expenseDate: form.expenseDate ? new Date(form.expenseDate).toISOString() : undefined,
        description: form.description || undefined,
      },
      {
        onSuccess: (created) => {
          setLastCreated(created);
          setLookupId(created.id);
          setActiveId(created.id);
          setDrawerOpen(false);
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create + get-by-id only — no list/search directory.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Expense</Button>
      </div>

      <FormSection title="Look up expense">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-md flex-1"
            placeholder="Expense UUID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <Button type="button" onClick={loadLookup}>
            Load
          </Button>
        </div>
        {activeId && (
          <div className="mt-3 text-sm">
            {lookupLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : lookupError || !lookedUp ? (
              <p className="text-destructive">Expense not found.</p>
            ) : (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div>ID: {lookedUp.id}</div>
                <div>Category: {lookedUp.category ?? '—'}</div>
                <div>Amount: {lookedUp.amount ?? '—'}</div>
              </div>
            )}
          </div>
        )}
      </FormSection>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created expense</div>
          <div>ID: {lastCreated.id}</div>
          <div>Category: {lastCreated.category}</div>
        </div>
      )}

      <FormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="New Expense"
        footer={
          <>
            <Button type="submit" form="expense-form" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
          <Field label="Organization">
            <ResourceSelect
              resource={Organizations}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="Store (optional)">
            <ResourceSelect
              resource={Stores}
              getLabel={(s) => s.name}
              value={form.storeId}
              onValueChange={(v) => setForm({ ...form, storeId: v })}
              placeholder="Select store…"
              allowNone
            />
          </Field>
          <Field label="Category" required>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
          </Field>
          <Field label="Amount" required>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </Field>
          <Field label="Expense Date" required>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              required
            />
          </Field>
          <Field label="Description (optional)">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </form>
      </FormDrawer>
    </div>
  );
}
