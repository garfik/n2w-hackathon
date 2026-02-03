/**
 * Wraps a route map so path-specific handler types are preserved (e.g. req.params.id).
 * Spread the result into serve({ routes: { ...router({ ... }), ... } }).
 * @see https://github.com/oven-sh/bun/issues/23182
 */
type RouteValueFor<Path extends string> =
  | Response
  | false
  | ((req: Bun.BunRequest<Path>) => Response | Promise<Response>)
  | Partial<
      Record<
        Bun.Serve.HTTPMethod,
        ((req: Bun.BunRequest<Path>) => Response | Promise<Response>) | Response
      >
    >;

export function router<R extends { [P in keyof R]: P extends string ? RouteValueFor<P> : never }>(
  routes: R
): R {
  return routes;
}
