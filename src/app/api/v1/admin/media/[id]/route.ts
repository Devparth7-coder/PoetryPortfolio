import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { deleteMedia, updateMedia } from "@/application/media/media-service";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = adminHandler<Ctx>(async (req, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); return ok(await updateMedia(id, await parseBody(req, z.object({ altText: z.string().max(500).nullable().optional(), caption: z.string().max(500).nullable().optional() })), user)); });
export const DELETE = adminHandler<Ctx>(async (_r, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); await deleteMedia(id, user); return ok({ deleted: true }); }, { role: "OWNER" });
