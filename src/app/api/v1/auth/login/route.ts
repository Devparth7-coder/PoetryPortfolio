import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { handler, ok, fail, parseBody } from "@/lib/api";
import { db } from "@/infrastructure/db/client";
import { adminUsers, auditLogs, loginAttempts } from "@/infrastructure/db/schema";
import { verifyPassword } from "@/infrastructure/auth/password";
import { assertSameOrigin, createSession } from "@/infrastructure/auth/session";
import { clientKey } from "@/infrastructure/ratelimit/limiter";
import { logger } from "@/infrastructure/logging/logger";
export const dynamic = "force-dynamic";
const Body = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });
const MAX_ATTEMPTS = 8, WINDOW_MIN = 15;

export const POST = handler(async (req) => {
  assertSameOrigin(req);
  const { email, password } = await parseBody(req, Body);
  const key = `login:${email.toLowerCase()}:${clientKey(req.headers)}`.slice(0, 120);
  const [att] = await db.select().from(loginAttempts).where(eq(loginAttempts.key, key));
  const fresh = !att || Date.now() - att.windowStart.getTime() > WINDOW_MIN * 60_000;
  if (!fresh && att.count >= MAX_ATTEMPTS) { logger.warn("auth.locked", { email: "[redacted]" }); return fail(429, "too_many_attempts", `Too many attempts. Try again in ${WINDOW_MIN} minutes.`); }
  const user = await db.query.adminUsers.findFirst({ where: eq(adminUsers.email, email.toLowerCase()) });
  const valid = user && user.isActive && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    await db.insert(loginAttempts).values({ key, count: 1, windowStart: new Date() }).onConflictDoUpdate({ target: loginAttempts.key, set: fresh ? { count: 1, windowStart: new Date() } : { count: sql`${loginAttempts.count} + 1` } });
    await db.insert(auditLogs).values({ action: "auth.login_failed", entityType: "admin_user", entityId: user?.id ?? null, summary: "Failed login" });
    logger.warn("auth.failed", {}); return fail(401, "invalid_credentials", "Email or password is incorrect");
  }
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
  await createSession(user.id);
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await db.insert(auditLogs).values({ actorId: user.id, actorEmail: user.email, action: "auth.login", entityType: "admin_user", entityId: user.id });
  return ok({ user: { name: user.name, role: user.role } });
}, { limit: { n: 20, windowMs: 60_000, key: "login" } });
