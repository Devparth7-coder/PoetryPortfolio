import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { adminUsers, sessions } from "@/infrastructure/db/schema";
import { cache } from "react";

export const SESSION_COOKIE = "dp_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

export type SessionUser = { id: string; email: string; name: string; role: "OWNER" | "EDITOR" | "VIEWER" };

function hashToken(t: string) { return createHash("sha256").update(t).digest("hex"); }

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_TTL_MS), userAgent: h });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_MS / 1000 });
  // opportunistic cleanup
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => {});
}

export async function destroySession() {
  const jar = await cookies(); const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** Server-side session lookup. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db.select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role, active: adminUsers.isActive })
    .from(sessions).innerJoin(adminUsers, eq(sessions.userId, adminUsers.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  const u = rows[0]; if (!u || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role };
});

export class UnauthorizedError extends Error { status = 401; constructor(m = "Unauthorized") { super(m); } }
export class ForbiddenError extends Error { status = 403; constructor(m = "Forbidden") { super(m); } }

const ROLE_RANK = { VIEWER: 0, EDITOR: 1, OWNER: 2 } as const;
export async function requireAdmin(minRole: keyof typeof ROLE_RANK = "VIEWER"): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new UnauthorizedError();
  if (ROLE_RANK[u.role] < ROLE_RANK[minRole]) throw new ForbiddenError();
  return u;
}

/** Double-submit style CSRF check for state-changing admin requests (in addition to SameSite cookies). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin"); const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return; // non-browser clients (no Origin) still need the session cookie, which they cannot obtain cross-site.
  const oh = new URL(origin).host;
  if (oh !== host) throw new ForbiddenError("Cross-origin request rejected");
}
