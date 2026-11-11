import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingSection({ title, description, children, className }: Props) {
  return (
    <div className={cn('grid grid-cols-1 gap-x-8 gap-y-4 py-8 md:grid-cols-3', className)}>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}
