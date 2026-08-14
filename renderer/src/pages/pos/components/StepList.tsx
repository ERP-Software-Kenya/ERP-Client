import type { CheckoutStep } from "../checkout";

export function StepList({ steps }: { steps: CheckoutStep[] }) {
  return (
    <ul className="max-h-36 space-y-1.5 overflow-y-auto text-left">
      {steps.map((s) => (
        <li
          key={s.name}
          className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs"
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                s.status === "ok"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : s.status === "failed"
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {s.status}
            </span>
            <span className="font-medium text-foreground">{s.name}</span>
          </div>
          {s.message && (
            <p className="mt-1 break-words text-muted-foreground leading-relaxed">
              {s.message}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
