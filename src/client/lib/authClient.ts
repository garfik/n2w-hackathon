import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.BUN_PUBLIC_BETTER_AUTH_URL ?? undefined,
});
