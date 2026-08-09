import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CreditApprovals } from '../../api';

function fmt(n: number) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BlackLedgerPage() {
  const { user } = useAuth();
  const canAccess = user?.roles.some((r) =>
    ['super_admin', 'org_admin', 'org_manager'].includes(r),
  );
  const { data, isLoading } = CreditApprovals.useBlackLedger();
  const payMut = CreditApprovals.useMarkCommissionPaid();

  if (!canAccess) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">
          This page requires organization admin or manager privileges.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin inline" />
      </div>
    );
  }

  const bills = data?.bills || [];
  const commissions = data?.commissions || [];

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Black Ledger</h1>
          <p className="text-muted-foreground mt-1">
            Black sales markup and commission payouts.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 flex-1 min-h-0 pb-6">
        <div className="bg-card rounded-xl border flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b bg-muted/30 shrink-0">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Recent Black Sales
            </h2>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b text-left sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-semibold text-muted-foreground">Ref</th>
                  <th className="px-4 py-2 font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-2 font-semibold text-right text-muted-foreground">
                    Markup
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No black sales yet.
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/40 transition">
                      <td className="px-4 py-3 font-mono text-xs">
                        {b.billNumber || b.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary tabular-nums">
                        {fmt(b.blackAmount || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-xl border flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b bg-muted/30 shrink-0">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              Commissions
            </h2>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b text-left sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-semibold text-muted-foreground">
                    Facilitator
                  </th>
                  <th className="px-4 py-2 font-semibold text-muted-foreground">Amount</th>
                  <th className="px-4 py-2 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-2 font-semibold text-right text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No commissions owed.
                    </td>
                  </tr>
                ) : (
                  commissions.map((c) => {
                    const paid = c.status === 'paid';
                    return (
                      <tr key={c.id} className="hover:bg-muted/40 transition">
                        <td className="px-4 py-3 font-medium">
                          {c.facilitatorName ||
                            (c.facilitatorUserId
                              ? `${c.facilitatorUserId.slice(0, 8)}…`
                              : '—')}
                        </td>
                        <td className="px-4 py-3 font-semibold tabular-nums">
                          {fmt(c.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {paid ? (
                            <span className="bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">
                              Paid
                            </span>
                          ) : (
                            <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                              Owed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!paid && (
                            <button
                              type="button"
                              onClick={() => payMut.mutate(c.id)}
                              disabled={payMut.isPending}
                              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                            >
                              Mark paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
