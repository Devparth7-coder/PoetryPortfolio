import { z } from "zod";
import { handler, ok, parseQuery } from "@/lib/api";
import { getRandomPoem } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
const Q = z.object({ exclude: z.string().max(4000).default(""), tags: z.string().max(500).default("") });
export const GET = handler(async (req) => { const q = parseQuery(req, Q); return ok(await getRandomPoem(q.exclude.split(",").filter(Boolean).slice(0, 100), q.tags.split(",").filter(Boolean).slice(0, 10)), { cache: "no-store" }); }, { limit: { n: 60, windowMs: 60_000 } });
