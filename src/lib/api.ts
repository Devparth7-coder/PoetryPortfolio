import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { logger } from "@/infrastructure/logging/logger";
import { ForbiddenError, UnauthorizedError } from "@/infrastructure/auth/session";
import { NotFoundError } from "@/application/poems/poem-service";
import { rateLimit, clientKey } from "@/infrastructure/ratelimit/limiter";

export type ApiError = { error: { code: string; message: string; details?: unknown } };
export function ok<T>(data: T, init?: ResponseInit & { cache?: string }) {
  const headers = new Headers(init?.headers); if (init?.cache) headers.set("cache-control", init.cache);
  return NextResponse.json({ data }, { ...init, headers });
}
export function fail(status: number, code: string, message: string, details?: unknown) { return NextResponse.json({ error: { code, message, ...(details !== undefined ? { details } : {}) } } satisfies ApiError, { status }); }

/** Wraps a route handler: maps domain errors → structured JSON, hides internals in production, logs latency. */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>, opts: { limit?: { n: number; windowMs: number; key?: string } } = {}) {
  return async (req: Request, ctx: Ctx) => {
    const start = performance.now(); const url = new URL(req.url);
    try {
      if (opts.limit) { const rl = rateLimit(`${opts.limit.key ?? url.pathname}:${clientKey(req.headers)}`, opts.limit.n, opts.limit.windowMs); if (!rl.ok) return fail(429, "rate_limited", "Too many requests. Please slow down.", { retryAfterMs: rl.retryAfterMs }); }
      const res = await fn(req, ctx);
      logger.info("http", { method: req.method, path: url.pathname, status: res.status, ms: Math.round(performance.now() - start) });
      return res;
    } catch (e) {
      const ms = Math.round(performance.now() - start);
      if (e instanceof ZodError) return fail(400, "validation_error", "Invalid request", e.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
      if (e instanceof UnauthorizedError) return fail(401, "unauthorized", "Authentication required");
      if (e instanceof ForbiddenError) return fail(403, "forbidden", e.message);
      if (e instanceof NotFoundError) return fail(404, "not_found", e.message);
      if (e instanceof SyntaxError) return fail(400, "bad_json", "Malformed JSON body");
      logger.error("http.error", { method: req.method, path: url.pathname, ms, error: e });
      return fail(500, "internal_error", process.env.NODE_ENV === "production" ? "Something went wrong" : (e as Error).message);
    }
  };
}
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> { return schema.parse(await req.json()); }
export function parseQuery<T>(req: Request, schema: ZodType<T>): T { return schema.parse(Object.fromEntries(new URL(req.url).searchParams)); }
