import { CreditApprovals } from "../../api";
import { format } from "date-fns";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { formatEntityLabel } from "../../lib/entityLabel";

export default function PendingApprovals() {
  const { data: approvals = [], isLoading } = CreditApprovals.useListPending();
  const approve = CreditApprovals.useApprove();
  const reject = CreditApprovals.useReject();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pending Credit Sales</h1>
      </div>

      <div className="grid gap-4 max-w-4xl">
        {approvals.length === 0 ? (
          <p className="text-muted-foreground bg-card p-6 rounded-xl border border-border">
            No pending credit approvals at this time.
          </p>
        ) : (
          approvals.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">
                    Customer {req.customerId.slice(0, 8)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-600 font-semibold rounded-full">
                    Needs Approval
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bill <span className="font-mono">{req.billId.slice(0, 8)}</span> • Requested by {req.requestedById.slice(0, 8)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(req.createdAt), "PPp")}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Amount</p>
                  <p className="text-xl font-bold text-primary">₹{req.requestedAmount}</p>
                </div>
                
                <div className="flex gap-2 ml-4 border-l border-border pl-4">
                  <button
                    onClick={() => reject.mutate(req.id)}
                    disabled={reject.isPending}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Reject"
                  >
                    <XCircle size={24} />
                  </button>
                  <button
                    onClick={() => approve.mutate(req.id)}
                    disabled={approve.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Approve
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
