import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { recordCompletion, recordFavorite, recordShare, recordView } from "@/application/analytics/analytics-service";
export const dynamic = "force-dynamic";
const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("view"), id: z.string().uuid() }), z.object({ type: z.literal("complete"), id: z.string().uuid() }),
  z.object({ type: z.literal("favorite"), id: z.string().uuid(), delta: z.union([z.literal(1), z.literal(-1)]) }), z.object({ type: z.literal("share"), id: z.string().uuid(), channel: z.string().max(30) }),
]);
/** Anonymous aggregate counters only. */
export const POST = handler(async (req) => {
  const b = await parseBody(req, Body);
  if (b.type === "view") await recordView(b.id); else if (b.type === "complete") await recordCompletion(b.id); else if (b.type === "favorite") await recordFavorite(b.id, b.delta); else await recordShare(b.id, b.channel);
  return ok({ recorded: true });
}, { limit: { n: 120, windowMs: 60_000 } });
