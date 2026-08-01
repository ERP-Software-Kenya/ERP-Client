import { useCallback, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export function Tooltip({
  content,
  children,
  side = 'right',
  className,
}: {
  content: string;
  children: ReactNode;
  side?: 'right' | 'top';
  /** Wrapper class — use `flex w-full` in sidebar icon rail so layout stays full-width. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(
    (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      if (side === 'right') {
        setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
      } else {
        setCoords({ top: rect.top - 8, left: rect.left + rect.width / 2 });
      }
    },
    [side],
  );

  const show = (e: MouseEvent | FocusEvent) => {
    updatePosition(e.currentTarget as HTMLElement);
    setOpen(true);
  };

  return (
    <span
      className={cn(className ?? 'inline-flex')}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: side === 'right' ? 'translateY(-50%)' : 'translate(-50%, -100%)',
              zIndex: 9999,
            }}
            className="pointer-events-none whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
