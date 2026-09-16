import { z } from "zod";
import { handler, ok, parseQuery } from "@/lib/api";
import { listPoems } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
const Q = z.object({ limit: z.coerce.number().int().min(1).max(100).default(24), offset: z.coerce.number().int().min(0).default(0), sort: z.enum(["newest", "oldest", "title", "mostRead", "longest", "shortest", "random"]).default("newest"), language: z.string().max(12).optional(), year: z.coerce.number().int().optional(), collection: z.string().max(120).optional(), tag: z.string().max(120).optional(), length: z.enum(["short", "medium", "long"]).optional(), source: z.string().max(30).optional(), featured: z.coerce.boolean().optional() });
export const GET = handler(async (req) => ok(await listPoems(parseQuery(req, Q)), { cache: "public, s-maxage=120, stale-while-revalidate=600" }), { limit: { n: 120, windowMs: 60_000 } });
