import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CreditApprovals } from '../../api';
import type { CreditApprovalRequest } from '../../types';

function fmt(n: number) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PendingApprovalsPage() {
  const { user } = useAuth();
  const canApprove = user?.roles.some((r) => ['super_admin', 'org_admin', 'org_manager'].includes(r));
  const { data: list, isLoading } = CreditApprovals.useListPending();
  const approveMut = CreditApprovals.useApprove();
  const rejectMut = CreditApprovals.useReject();

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and approve credit sales.</p>
        </div>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b text-left sticky top-0">
            <tr>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Date</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Bill Ref</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Customer</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Requested By</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground">Amount</th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!list || list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No pending approvals.
                </td>
              </tr>
            ) : (
              list.map((item: CreditApprovalRequest) => (
                <tr key={item.id} className="hover:bg-muted/50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.bill?.billNumber || item.billId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    {item.bill?.customerId ? `Cust ${item.bill.customerId.slice(0, 8)}` : 'Walk-in'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.requestedById}
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(item.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {canApprove ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => approveMut.mutate(item.id)}
                          disabled={approveMut.isPending || rejectMut.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 rounded-lg transition disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectMut.mutate(item.id)}
                          disabled={approveMut.isPending || rejectMut.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 rounded-lg transition disabled:opacity-50"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No permission</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
