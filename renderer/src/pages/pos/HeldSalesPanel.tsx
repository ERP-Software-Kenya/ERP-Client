import { PauseCircle, X } from "lucide-react";
import { Bills } from "../../api";
import type { Bill } from "../../types";

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HeldSalesPanel({
  locationId,
  onClose,
  onResume,
}: {
  locationId: string;
  onClose: () => void;
  onResume: (billId: string) => void;
}) {
  const filters: Record<string, string> = { status: "DRAFT" };
  if (locationId) filters.locationId = locationId;
  const { data, isLoading } = Bills.useSearch({ filters });
  const bills = data?.items ?? [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end pos-no-print">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-80 flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PauseCircle size={15} />
            Held Sales
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-xs text-muted-foreground">Loading…</p>
          ) : bills.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">
              No held sales{locationId ? " at this location" : ""}.
            </p>
          ) : (
            bills.map((b: Bill) => (
              <div
                key={b.id}
                className="border-b border-border px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {b.walkInName ||
                      (b.customerId
                        ? `Customer ${b.customerId.slice(0, 8)}…`
                        : "Walk-in")}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                    {b.createdAt
                      ? new Date(b.createdAt).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {fmt(Number(b.totalAmount ?? 0))}
                  </span>
                  <button
                    type="button"
                    onClick={() => onResume(b.id)}
                    className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    Resume
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
