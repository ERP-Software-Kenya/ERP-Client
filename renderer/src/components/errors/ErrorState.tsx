import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ERROR_COPY, type ErrorStateType } from './errorCopy';
import { ErrorIllustration } from './ErrorIllustrations';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  type: ErrorStateType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Called before navigating home (e.g. reset an error boundary). */
  onGoHome?: () => void;
  className?: string;
}

export function ErrorState({
  type,
  title,
  message,
  onRetry,
  onGoHome,
  className,
}: ErrorStateProps) {
  const navigate = useNavigate();
  const copy = ERROR_COPY[type];
  const showRetry = copy.showRetry && typeof onRetry === 'function';

  return (
    <div
      className={cn(
        'flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <ErrorIllustration type={type} />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title ?? copy.title}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">{message ?? copy.message}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {showRetry && (
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button
          type="button"
          variant={showRetry ? 'outline' : 'default'}
          onClick={() => {
            onGoHome?.();
            navigate('/');
          }}
        >
          Go home
        </Button>
      </div>
    </div>
  );
}
