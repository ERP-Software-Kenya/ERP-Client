import type { ReactNode } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';

export interface GuideStep {
  icon: ReactNode;
  title: string;
  description: string;
}

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  steps: GuideStep[];
  tip?: string;
}

export function GuideModal({ open, onClose, title, description, steps, tip }: GuideModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-guide-backdrop">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-guide-modal"
      >
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/8 to-transparent px-6 pt-6 pb-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <HelpCircle size={22} />
          </div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3 px-6 py-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-primary ring-1 ring-border">
                <span className="flex items-center justify-center">{step.icon}</span>
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        {tip && (
          <div className="mx-6 mb-4 rounded-lg border border-primary/20 bg-primary/8 px-3 py-2">
            <p className="text-xs text-primary/90">
              <span className="font-semibold">Tip:</span> {tip}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-6 py-3">
          <Button size="sm" onClick={onClose}>
            Got it, let&apos;s go!
          </Button>
        </div>
      </div>
    </div>
  );
}
