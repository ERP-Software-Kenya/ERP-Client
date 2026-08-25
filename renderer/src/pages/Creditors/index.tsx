import { useEffect, useMemo, useState } from 'react';
import { Plus, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Customers, Organizations } from '../../api';
import { CustomerFormDrawer } from '../../components/CustomerFormDrawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useSession } from '../../context/SessionContext';
import { usePagination } from '../../hooks/usePagination';
import { loadErrorMessage } from '../../lib/api-error';
import { fmt } from '../pos/posHelpers';
import { CustomerDetailContent } from '../CustomerDetail';
import type { CreditStatus } from '../../types';
import { outstandingCreditors, remainingCredit } from './creditors';
import { printCreditorStatement } from './statementPdf';

const STATUS_LABEL: Record<CreditStatus, string> = {
  over: 'Over limit',
  warning: 'Nearing limit',
  available: 'Available',
  none: 'No limit',
};

const STATUS_DOT: Record<CreditStatus, string> = {
  over: 'bg-red-500',
  warning: 'bg-amber-500',
  available: 'bg-green-500',
  none: 'bg-muted-foreground/30',
};

export default function CreditorsPage() {
  const { organization } = useSession();
  const { data: orgs } = Organizations.useList();
  const org = orgs?.find((o) => o.id === organization?.id);
  const { setSearch, debouncedSearch } = usePagination();
  const { data, isLoading, isError, error, refetch } = Customers.useSearch({
    search: debouncedSearch,
    hasCreditLimit: true,
  });
  const listError = isError ? loadErrorMessage(error, 'creditors') : null;
  const rows = useMemo(
    () => outstandingCreditors(listError ? [] : (data?.items ?? [])),
    [data?.items, listError],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (selectedId) return;
    if (rows[0]) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  async function handlePrint() {
    if (!selectedId) {
      toast.error('Select a creditor first');
      return;
    }
    setPrinting(true);
    try {
      await printCreditorStatement({
        customerId: selectedId,
        orgName: organization?.name || org?.name || 'Account statement',
        orgPhone: org?.phone,
        orgAddress: org?.address,
        logoUrl: organization?.logoUrl,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not print statement');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 gap-3 p-3">
      <aside className="w-[min(420px,40%)] shrink-0 flex flex-col min-h-0 rounded-lg border border-border bg-card">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-sm font-semibold">Creditors</h1>
              <p className="text-xs text-muted-foreground">People who currently owe money</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" type="button" onClick={() => setDrawerOpen(true)}>
                <Plus size={14} /> Add
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={!selectedId || printing}
                onClick={() => void handlePrint()}
              >
                <Printer size={14} /> {printing ? 'Printing…' : 'Print'}
              </Button>
              <Button size="icon" type="button" variant="ghost" title="Refresh" onClick={() => void refetch()}>
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>
          <Input placeholder="Search by name…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading && !listError ? (
            <p className="p-3 text-sm text-muted-foreground">Loading…</p>
          ) : listError ? (
            <p className="p-3 text-sm text-destructive">{listError}</p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No outstanding creditors on this page.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium text-right">Owed</th>
                  <th className="px-2 py-2 font-medium text-right">Remaining</th>
                  <th className="px-2 py-2 font-medium text-right">Limit</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const selected = row.id === selectedId;
                  const status = row.creditStatus ?? 'none';
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-t border-border ${selected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="px-3 py-2 font-medium">{row.name || '—'}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(row.creditBalance ?? 0)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(remainingCredit(row))}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.creditLimit != null ? fmt(row.creditLimit) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
                          {STATUS_LABEL[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
          First page of results only — same limit as Customers.
        </p>
      </aside>

      <section className="flex-1 min-w-0 min-h-0 overflow-auto rounded-lg border border-border bg-card">
        {selectedId ? (
          <CustomerDetailContent customerId={selectedId} onCreditUpdated={() => void refetch()} />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">Select a creditor to see their account.</p>
        )}
      </section>

      <CustomerFormDrawer
        open={drawerOpen}
        requireCreditLimit
        onClose={() => setDrawerOpen(false)}
        onSaved={(customer) => {
          setDrawerOpen(false);
          setSelectedId(customer.id);
          void refetch();
        }}
      />
    </div>
  );
}
