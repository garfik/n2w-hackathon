import { auth } from '../auth';
import { apiErr } from '../routes/response';

/**
 * Get session from request (cookies). Returns apiErr(401) or user payload.
 */
export async function requireUser(
  req: Request
): Promise<Response | { userId: string; email: string }> {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  if (!session?.user) {
    return apiErr({ message: 'Unauthorized' }, 401);
  }
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
  };
}
