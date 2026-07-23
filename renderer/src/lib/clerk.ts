import { Clerk } from '@clerk/clerk-js';

const devBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey && !devBypass) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set — add it to renderer/.env');
}

// ponytail: dummy key placeholder, only reached when devBypass is true and AuthContext skips clerk.load()
export const clerk = new Clerk(publishableKey || 'pk_test_bypass');
