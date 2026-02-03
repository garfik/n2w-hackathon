import { auth } from '../auth';

export type RequireUserResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; response: Response };

/**
 * Get session from request (cookies). Returns user info or 401 response.
 */
export async function requireUser(req: Request): Promise<RequireUserResult> {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  if (!session?.user) {
    return {
      ok: false,
      response: Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return {
    ok: true,
    userId: session.user.id,
    email: session.user.email ?? '',
  };
}
