import { HttpError } from './http';

type ValidationItem = { field?: string; message?: string };

function formatValidationErrors(errors: unknown[]): string {
  const parts = errors
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const row = item as ValidationItem;
        if (row.field && row.message) return `${row.field}: ${row.message}`;
        if (row.message) return row.message;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  return parts.join('; ');
}

const GENERIC_ERRORS = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Internal Server Error',
  'Database Error',
]);

/** Parse API JSON/text bodies into one user-facing message. */
export function formatApiErrorBody(body: unknown, statusText = ''): string {
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return statusText || 'Request failed';
    try {
      return formatApiErrorBody(JSON.parse(trimmed), statusText);
    } catch {
      return trimmed;
    }
  }

  if (!body || typeof body !== 'object') {
    return statusText || 'Request failed';
  }

  const json = body as Record<string, unknown>;

  if (Array.isArray(json.errors) && json.errors.length > 0) {
    return formatValidationErrors(json.errors);
  }

  const message = json.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.map(String).filter(Boolean).join('; ');
  }

  if (typeof json.error === 'string' && json.error.trim() && !GENERIC_ERRORS.has(json.error)) {
    return json.error;
  }

  return statusText || 'Request failed';
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof HttpError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

/** Detect credit-limit approval flow from a failed bill COMPLETED transition. */
export function parseCreditApprovalError(error: unknown): {
  isPendingApproval: boolean;
  approvalRequestId?: string;
} {
  if (!(error instanceof HttpError)) {
    return { isPendingApproval: false };
  }
  const msg = error.message;
  const isPendingApproval =
    /sent for approval/i.test(msg) ||
    /exceeds customer credit limit/i.test(msg);
  if (!isPendingApproval) {
    return { isPendingApproval: false };
  }
  const body = error.body;
  const id =
    (typeof body?.approvalRequestId === 'string' && body.approvalRequestId) ||
    (typeof body?.message === 'object' &&
      body.message !== null &&
      typeof (body.message as Record<string, unknown>).approvalRequestId === 'string' &&
      (body.message as Record<string, unknown>).approvalRequestId as string) ||
    undefined;
  return { isPendingApproval: true, approvalRequestId: id };
}

/** Prefix for list/load failures while keeping the server message visible. */
export function loadErrorMessage(error: unknown, resource: string): string {
  const detail = getErrorMessage(error, '');
  return detail ? `Unable to load ${resource}: ${detail}` : `Unable to load ${resource}.`;
}
