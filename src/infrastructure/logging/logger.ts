type Level = "debug" | "info" | "warn" | "error";
const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const current = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? 20;
const REDACT = /(password|token|secret|authorization|cookie|passwordHash)/i;

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 4 || obj == null || typeof obj !== "object") return obj;
  if (obj instanceof Error) return { name: obj.name, message: obj.message, stack: process.env.NODE_ENV === "production" ? undefined : obj.stack };
  if (Array.isArray(obj)) return obj.slice(0, 20).map((v) => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) out[k] = REDACT.test(k) ? "[redacted]" : sanitize(v, depth + 1);
  return out;
}

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (LEVELS[level] < current) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(ctx ? (sanitize(ctx) as object) : {}) });
  if (level === "error") console.error(line); else if (level === "warn") console.warn(line); else console.log(line);
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => emit("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => emit("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => emit("error", m, c),
  /** Time an async operation and log latency (used for search, db, imports). */
  async time<T>(label: string, fn: () => Promise<T>, ctx?: Record<string, unknown>): Promise<T> {
    const s = performance.now();
    try { const r = await fn(); emit("debug", label, { ...ctx, ms: Math.round(performance.now() - s) }); return r; }
    catch (e) { emit("error", `${label} failed`, { ...ctx, ms: Math.round(performance.now() - s), error: e }); throw e; }
  },
};
