import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { db } from "@/infrastructure/db/client"; import { settings, auditLogs } from "@/infrastructure/db/schema";
export const dynamic = "force-dynamic";
const Body = z.object({ site: z.object({ title: z.string().max(100), tagline: z.string().max(200), commentsEnabled: z.boolean() }), book: z.object({ title: z.string().max(100), subtitle: z.string().max(200), dedication: z.string().max(2000) }) });
export const PUT = adminHandler(async (req, _c, user) => { const b = await parseBody(req, Body); for (const [key, value] of Object.entries(b)) await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } }); await db.insert(auditLogs).values({ actorId: user.id, actorEmail: user.email, action: "settings.update", entityType: "settings" }); return ok({ saved: true }); }, { role: "OWNER" });
