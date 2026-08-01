export type ErrorStateType = 'not-found' | 'crash' | 'load' | 'offline' | 'generic';

export const ERROR_COPY: Record<
  ErrorStateType,
  { title: string; message: string; showRetry: boolean }
> = {
  'not-found': {
    title: 'This page wandered off',
    message: "We can't find that page. It may have moved or never existed.",
    showRetry: false,
  },
  crash: {
    title: 'Something broke',
    message: 'We hit a snag rendering this screen. Try again or head home.',
    showRetry: true,
  },
  load: {
    title: "Couldn't load this",
    message: "The data didn't come through. Check your connection and try again.",
    showRetry: true,
  },
  offline: {
    title: "You're offline",
    message: 'Check your internet connection, then try again.',
    showRetry: true,
  },
  generic: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. You can try again or go home.',
    showRetry: true,
  },
};
