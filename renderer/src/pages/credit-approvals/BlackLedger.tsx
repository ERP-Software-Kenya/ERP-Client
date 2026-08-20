import { CreditApprovals } from "../../api";
import { CheckCircle2, Loader2, HandCoins } from "lucide-react";
import { formatEntityLabel } from "../../lib/entityLabel";

export default function BlackLedger() {
  const { data, isLoading } = CreditApprovals.useBlackLedger();
  const markPaid = CreditApprovals.useMarkCommissionPaid();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const bills = data?.bills || [];
  const commissions = data?.commissions || [];

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-muted/30">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Black Ledger</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-800"></span>
            Black Sales History
          </h2>
          {bills.length === 0 ? (
            <p className="text-muted-foreground text-sm">No black sales recorded.</p>
          ) : (
            <div className="space-y-3">
              {bills.map(b => (
                <div key={b.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">Bill {b.billNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(b.createdAt!).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-lg">₹{b.totalAmount}</p>
                      {b.blackAmount && (
                        <p className="text-xs font-semibold text-emerald-600">Black: ₹{b.blackAmount}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HandCoins size={18} className="text-amber-500" />
            Commissions & Facilitators
          </h2>
          {commissions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No commissions to display.</p>
          ) : (
            <div className="space-y-3">
              {commissions.map(c => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {c.facilitatorName || `User ${c.facilitatorUserId?.slice(0, 8) || "Unknown"}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Bill Ref: {c.billId.slice(0, 8)}</p>
                    <div className="mt-1">
                      {c.status === 'paid' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                          PAID on{" "}
                          {new Date(c.paidAt!).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          OWED
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-right">
                    <p className="font-bold text-amber-600 text-lg">₹{c.amount}</p>
                    {c.status === 'owed' && (
                      <button
                        onClick={() => markPaid.mutate(c.id)}
                        disabled={markPaid.isPending}
                        className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground transition"
                        title="Mark Paid"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
