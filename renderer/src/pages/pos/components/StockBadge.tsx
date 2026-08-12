import type { SaleType } from "../../../types";
import {
  stockBadgeLabel,
  stockBadgeTone,
  type StockInfo,
} from "../posStock";

const TONE_CLS: Record<ReturnType<typeof stockBadgeTone>, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  low: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  out: "bg-red-500/15 text-red-600 dark:text-red-400",
  none: "bg-muted text-muted-foreground",
};

export function StockBadge({
  info,
  saleType,
  className = "",
}: {
  info: StockInfo;
  saleType: SaleType;
  className?: string;
}) {
  const tone = stockBadgeTone(info);
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${TONE_CLS[tone]} ${className}`}
      title={
        info.found
          ? saleType === "black"
            ? `Black pool: ${info.unpublished} · Official on hand: ${info.onHand}`
            : `On hand: ${info.onHand} · Reserved: ${info.reserved}`
          : "No inventory row for this product at the selected location"
      }
    >
      {stockBadgeLabel(info, saleType)}
    </span>
  );
}
