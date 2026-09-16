import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { aiEnabled, explorePoem, suggestMetadata } from "@/application/ai/ai-service";
export const dynamic = "force-dynamic";
export const GET = adminHandler(async () => ok({ enabled: aiEnabled() }));
export const POST = adminHandler(async (req) => { const b = await parseBody(req, z.object({ task: z.enum(["suggest", "explore"]), title: z.string().max(300), body: z.string().max(60_000) })); return ok(b.task === "suggest" ? await suggestMetadata(b) : await explorePoem(b)); });
