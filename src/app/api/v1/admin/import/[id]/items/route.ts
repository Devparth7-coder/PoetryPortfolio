import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { getItemWithMatch, setItemResolution } from "@/application/import/import-service";
import { diffLines } from "@/domain/poem/similarity";
export const dynamic = "force-dynamic";
const Body = z.object({ itemId: z.string().uuid(), resolution: z.enum(["create", "merge-source", "replace-canonical", "keep-variant", "skip"]).nullable(), overrides: z.object({ title: z.string().max(300).optional(), language: z.string().max(12).optional(), date: z.string().nullable().optional() }).optional() });
export const GET = adminHandler(async (req) => { const itemId = z.string().uuid().parse(new URL(req.url).searchParams.get("itemId")); const r = await getItemWithMatch(itemId); return ok({ ...r, diff: r.matched ? diffLines(r.matched.body, r.item.body) : null }); });
export const PATCH = adminHandler(async (req, _c, user) => { const b = await parseBody(req, Body); const o = b.overrides ? { ...b.overrides, date: b.overrides.date === undefined ? undefined : b.overrides.date ? new Date(b.overrides.date) : null } : undefined; return ok(await setItemResolution(b.itemId, b.resolution, user, o)); });
