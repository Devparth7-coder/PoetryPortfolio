import { z } from "zod";
import { ok, parseBody, parseQuery } from "@/lib/api";
import { adminHandler, PoemInputSchema } from "@/lib/admin-api";
import { createPoem, listPoems } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
const Q = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).default(0), status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED", "ALL"]).default("ALL"), sort: z.enum(["newest", "oldest", "title"]).default("newest") });
export const GET = adminHandler(async (req) => ok(await listPoems({ ...parseQuery(req, Q), includeDrafts: true })));
export const POST = adminHandler(async (req, _ctx, user) => { const input = await parseBody(req, PoemInputSchema); const w = await createPoem(input, user, { changeNote: input.changeNote ?? "Created in editor" }); return ok({ id: w.id, slug: w.slug }, { status: 201 }); });
