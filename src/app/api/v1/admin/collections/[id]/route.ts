import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { adminHandler, CollectionInputSchema } from "@/lib/admin-api";
import { deleteCollection, upsertCollection } from "@/application/collections/collection-service";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = adminHandler<Ctx>(async (req, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); return ok(await upsertCollection(id, await parseBody(req, CollectionInputSchema), user)); });
export const DELETE = adminHandler<Ctx>(async (_r, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); await deleteCollection(id, user); return ok({ deleted: true }); }, { role: "OWNER" });
