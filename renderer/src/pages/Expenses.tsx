import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Expense | null>(null);

  const createMutation = useMutation({
    mutationFn: (body: Partial<Expense>) => ExpensesApi.create(body),
    onSuccess: (created) => {
      toast.success('Expense created');
      setLastCreated(created);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create expense'),
  });

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
        <Button onClick={() => setDialogOpen(true)}>New Expense</Button>
      </div>

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
          <div className="font-medium">Last created expense</div>
          <div>ID: {lastCreated.id}</div>
          <div>Category: {lastCreated.category}</div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <ResourceSelect
                queryKey="organizations"
                fetchList={() => OrganizationsApi.list()}
                getLabel={(org) => org.name}
                value={form.organizationId}
                onValueChange={(v) => setForm({ ...form, organizationId: v })}
                placeholder="Select organization…"
              />
            </div>
            <div className="space-y-2">
              <Label>Store (optional)</Label>
              <ResourceSelect
                queryKey="stores"
                fetchList={() => StoresApi.list()}
                getLabel={(s) => s.name}
                value={form.storeId}
                onValueChange={(v) => setForm({ ...form, storeId: v })}
                placeholder="Select store…"
                allowNone
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-category">Category</Label>
              <Input
                id="exp-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-date">Expense Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-description">Description (optional)</Label>
              <Input
                id="exp-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
