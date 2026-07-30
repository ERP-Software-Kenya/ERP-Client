import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FormDrawer, Field } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { Expenses as ExpensesApi, Organizations as OrganizationsApi, Stores as StoresApi } from '../api';
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

export default function Expenses() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Expense | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Partial<Expense>) => ExpensesApi.create(body),
    onSuccess: (created) => {
      toast.success('Expense created');
      setLastCreated(created);
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create expense'),
  });

  const closeDrawer = () => setDrawerOpen(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      organizationId: form.organizationId || undefined,
      storeId: form.storeId || undefined,
      category: form.category || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      expenseDate: form.expenseDate ? new Date(form.expenseDate).toISOString() : undefined,
      description: form.description || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            No list endpoint exists for expenses — there's no directory here, only a create form.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Expense</Button>
      </div>

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
              queryKey="organizations"
              fetchList={() => OrganizationsApi.list()}
              getLabel={(org) => org.name}
              value={form.organizationId}
              onValueChange={(v) => setForm({ ...form, organizationId: v })}
              placeholder="Select organization…"
            />
          </Field>
          <Field label="Store (optional)">
            <ResourceSelect
              queryKey="stores"
              fetchList={() => StoresApi.list()}
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
