import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdvancedIdLookup } from '../components/AdvancedIdLookup';
import { RecentRecords } from '../components/RecentRecords';
import { FormDrawer, Field, FormSection } from '../components/FormDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ResourceSelect } from '../components/ResourceSelect';
import { Expenses, Organizations, Stores, get } from '../api';
import { formatEntityLabel } from '../lib/entityLabel';
import { HYDRATE_LIMIT, RECENT_NS, useRecentIds } from '../lib/recentIds';
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

function copyId(id: string) {
  void navigator.clipboard.writeText(id).then(
    () => toast.success('ID copied'),
    () => toast.error('Could not copy ID'),
  );
}

function expenseLabel(expense: Pick<Expense, 'id' | 'category' | 'amount' | 'description'>) {
  const cat = expense.category?.trim();
  const amt = expense.amount != null ? String(expense.amount) : undefined;
  if (cat && amt) return `${cat} · ${amt}`;
  if (cat) return cat;
  if (amt) return amt;
  const desc = expense.description?.trim();
  if (desc) return desc.length > 48 ? `${desc.slice(0, 48)}…` : desc;
  return formatEntityLabel({ id: expense.id });
}

function formatExpenseDate(value: string | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

export default function ExpensesPage() {
  const recent = useRecentIds(RECENT_NS.expenses);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lastCreated, setLastCreated] = useState<Expense | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [activeId, setActiveId] = useState<string | undefined>();

  const createMutation = Expenses.useCreate();
  const { data: lookedUp, isLoading: lookupLoading, error: lookupError } = Expenses.useGet(activeId);

  const closeDrawer = () => setDrawerOpen(false);

  const recentQueries = useQueries({
    queries: recent.entries.slice(0, HYDRATE_LIMIT).map((e) => ({
      queryKey: ['expenses', e.id] as const,
      queryFn: () => get<Expense>(`/api/v1/expenses/${e.id}`),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const listRows = useMemo(
    () =>
      recent.entries.map((e, i) => {
        const q = i < HYDRATE_LIMIT ? recentQueries[i] : undefined;
        const data = q?.data;
        return {
          id: e.id,
          label: e.label,
          savedAt: e.savedAt,
          category: data?.category,
          amount: data?.amount,
          expenseDate: data?.expenseDate,
          loading: q?.isLoading ?? false,
          failed: !!q?.isError,
        };
      }),
    [recent.entries, recentQueries],
  );

  useEffect(() => {
    const loaded = lookedUp;
    if (!loaded || loaded.id !== activeId) return;
    recent.push(loaded.id, expenseLabel(loaded));
  }, [activeId, lookedUp, recent.push]);

  const loadById = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      toast.error('Enter an expense ID');
      return;
    }
    setActiveId(trimmed);
    setLookupId(trimmed);
    recent.push(trimmed);
  };

  const loadExpense = () => loadById(lookupId);

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
          setActiveId(created.id);
          setLookupId(created.id);
          recent.push(
            created.id,
            expenseLabel({
              ...created,
              category: created.category ?? form.category,
              amount: created.amount ?? (form.amount ? Number(form.amount) : undefined),
              description: created.description ?? form.description,
            }),
          );
          closeDrawer();
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create expenses and reopen recent ones saved in this browser.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>New Expense</Button>
      </div>

      <RecentRecords
        title="Recent expenses"
        emptyHint="No recent expenses yet. Create one or use Advanced load by ID — it will appear here."
        rows={listRows}
        columns={[
          {
            key: 'category',
            header: 'Category',
            render: (r) => {
              if (r.loading) return '…';
              if (r.failed) return r.label?.trim() || 'unavailable';
              return r.category || r.label || '—';
            },
          },
          {
            key: 'amount',
            header: 'Amount',
            render: (r) =>
              r.loading ? '…' : r.failed ? 'unavailable' : r.amount != null ? r.amount : '—',
          },
          {
            key: 'date',
            header: 'Date',
            render: (r) =>
              r.loading ? '…' : r.failed ? 'unavailable' : formatExpenseDate(r.expenseDate),
          },
          {
            key: 'saved',
            header: 'Saved',
            render: (r) => new Date(r.savedAt).toLocaleString(),
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => loadById(r.id)}>
                  Open
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => recent.remove(r.id)}>
                  Remove
                </Button>
              </div>
            ),
          },
        ]}
        rowKey={(r) => r.id}
        onClear={recent.clear}
      />

      <AdvancedIdLookup
        entityLabel="expense"
        value={lookupId}
        onChange={setLookupId}
        onLoad={loadExpense}
      />

      {activeId && (
        <FormSection title="Expense">
          {lookupLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : lookupError || !lookedUp ? (
            <p className="text-sm text-destructive">
              Expense not found
              {lookupError instanceof Error && lookupError.message ? `: ${lookupError.message}` : '.'}
            </p>
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <span className="text-muted-foreground">ID:</span> {lookedUp.id}
                <Button type="button" variant="outline" size="sm" onClick={() => copyId(lookedUp.id)}>
                  Copy
                </Button>
              </p>
              <p>
                <span className="text-muted-foreground">Category:</span> {lookedUp.category ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Amount:</span>{' '}
                {lookedUp.amount != null ? lookedUp.amount : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Date:</span> {formatExpenseDate(lookedUp.expenseDate)}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Description:</span> {lookedUp.description ?? '—'}
              </p>
            </div>
          )}
        </FormSection>
      )}

      {lastCreated && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
          <div className="font-medium">Last created expense</div>
          <div>{expenseLabel(lastCreated)}</div>
          <div className="flex flex-wrap items-center gap-2">
            ID: {lastCreated.id}
            <Button type="button" variant="outline" size="sm" onClick={() => copyId(lastCreated.id)}>
              Copy
            </Button>
          </div>
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
