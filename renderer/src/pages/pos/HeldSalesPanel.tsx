import { useState } from "react";
import { ListRestart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Bills } from "../../api";
import { get } from "../../lib/http";
import type { Bill } from "../../types";

interface Props {
  /** Held sales are scoped to the currently selected stock location — never show other locations' drafts. */
  locationId: string;
  onResume: (bill: Bill) => void;
  onClose: () => void;
}

export function HeldSalesPanel({ locationId, onResume, onClose }: Props) {
  const [resumingId, setResumingId] = useState<string | null>(null);

  const { data: billsPage, isLoading } = Bills.useSearch({
    filters: { status: "DRAFT", locationId },
    enabled: !!locationId,
  });

  const drafts = billsPage?.items ?? [];

  const handleResume = async (id: string) => {
    setResumingId(id);
    try {
      // The search row doesn't reliably carry items — fetch the full bill before resuming.
      const full = await get<Bill>(`/api/v1/bills/${id}`);
      onResume(full);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load held sale");
    } finally {
      setResumingId(null);
    }
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-card border-l border-border shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold flex items-center gap-2 text-sm text-foreground">
          <ListRestart size={16} className="text-amber-500" />
          Held Sales
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-muted rounded text-muted-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!locationId ? (
          <p className="text-sm text-muted-foreground text-center p-8">
            Select a location to view held sales.
          </p>
        ) : isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-8">
            No held sales at this location.
          </p>
        ) : (
          <div className="space-y-2">
            {drafts.map((b: Bill) => (
              <div
                key={b.id}
                className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition text-sm"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {b.walkInName ||
                        (b.customerId ? `Customer ${b.customerId.slice(0, 8)}…` : "Walk-in")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.createdAt ? new Date(b.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-primary flex-shrink-0">
                    ${b.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {b.items?.length ?? 0} item{b.items?.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleResume(b.id)}
                    disabled={resumingId === b.id}
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {resumingId === b.id ? "Loading…" : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
