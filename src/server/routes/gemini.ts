import { router } from './router';
import { requireUser } from '../lib/requireUser';
import { GeminiClientError, GeminiParseError } from '../lib/gemini';
import { pingOk } from '../prompts';

function apiError(code: string, message: string, status: number): Response {
  return Response.json({ ok: false as const, error: { code, message } }, { status });
}

export const geminiRoutes = router({
  '/api/gemini/health': {
    async GET(req) {
      const userResult = await requireUser(req);
      if (!userResult.ok) {
        return Response.json(
          {
            ok: false as const,
            error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
          },
          { status: 401 }
        );
      }

      if (!process.env.GEMINI_API_KEY) {
        return apiError('CONFIG_ERROR', 'GEMINI_API_KEY is not set', 503);
      }

      const start = Date.now();

      try {
        const data = await pingOk();
        const latencyMs = Date.now() - start;
        const model = process.env.GEMINI_MODEL_TEXT ?? 'gemini-2.0-flash';

        return Response.json({
          ok: true as const,
          data: { ok: data.ok },
          meta: { latencyMs, model },
        });
      } catch (err) {
        if (err instanceof GeminiClientError) {
          const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
          return apiError(err.code, err.message, status);
        }
        if (err instanceof GeminiParseError) {
          return apiError(err.code, err.message, 502);
        }
        const message = err instanceof Error ? err.message : String(err);
        return apiError('AI_ERROR', message, 502);
      }
    },
  },
});
