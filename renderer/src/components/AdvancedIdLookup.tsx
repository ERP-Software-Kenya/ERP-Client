import { useEffect, useState } from 'react';
import { FormSection } from './FormDrawer';
import { Button } from './ui/button';
import { Input } from './ui/input';

export interface AdvancedIdLookupProps {
  entityLabel: string;
  value: string;
  onChange: (value: string) => void;
  onLoad: () => void;
  hint?: string;
  /** Start expanded — use when the caller's flow makes load-by-ID the primary next step. */
  defaultOpen?: boolean;
}

export function AdvancedIdLookup({
  entityLabel,
  value,
  onChange,
  onLoad,
  hint,
  defaultOpen = false,
}: AdvancedIdLookupProps) {
  const [open, setOpen] = useState(defaultOpen);

  // defaultOpen can flip true after mount (e.g. a pending step appears) — react to that too.
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <FormSection title="Advanced">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : 'Show'} load by ID
      </Button>
      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            {hint ?? `No ${entityLabel} directory from the API — paste an ID only if you already have one.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-md flex-1"
              placeholder={`${entityLabel} ID`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <Button type="button" onClick={onLoad}>
              Load
            </Button>
          </div>
        </div>
      ) : null}
    </FormSection>
  );
}
