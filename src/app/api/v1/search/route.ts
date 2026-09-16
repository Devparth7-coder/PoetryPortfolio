import { z } from "zod";
import { handler, ok, parseQuery } from "@/lib/api";
import { searchPoems } from "@/application/search/search-service";
export const dynamic = "force-dynamic";
const Q = z.object({ q: z.string().max(200).default(""), limit: z.coerce.number().int().min(1).max(50).default(20), offset: z.coerce.number().int().min(0).default(0) });
export const GET = handler(async (req) => { const { q, limit, offset } = parseQuery(req, Q); return ok(await searchPoems(q, { limit, offset }), { cache: "public, s-maxage=60, stale-while-revalidate=300" }); }, { limit: { n: 90, windowMs: 60_000 } });
