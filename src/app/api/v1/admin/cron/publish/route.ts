import { handler, ok, fail } from "@/lib/api";
import { runScheduledPublishing } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
/** Called by a scheduler (Vercel Cron / system cron) with `Authorization: Bearer $CRON_SECRET`. */
export const GET = handler(async (req) => { const secret = process.env.CRON_SECRET; if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail(401, "unauthorized", "Missing or invalid cron secret"); return ok(await runScheduledPublishing()); });
