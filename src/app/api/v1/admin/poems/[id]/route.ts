import { z } from "zod";
import { fail, ok, parseBody } from "@/lib/api";
import { adminHandler, PoemInputSchema } from "@/lib/admin-api";
import { getAdminPoem, softDeletePoem, updatePoem } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const GET = adminHandler<Ctx>(async (_r, { params }) => { const { id } = await params; z.string().uuid().parse(id); const p = await getAdminPoem(id); return p ? ok(p) : fail(404, "not_found", "Poem not found"); });
export const PATCH = adminHandler<Ctx>(async (req, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); const input = await parseBody(req, PoemInputSchema.partial()); const w = await updatePoem(id, input, user, input.changeNote); return ok({ id: w.id, slug: w.slug, version: w.version, status: w.status, updatedAt: w.updatedAt }); });
export const DELETE = adminHandler<Ctx>(async (_r, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); await softDeletePoem(id, user); return ok({ archived: true }); }, { role: "OWNER" });
