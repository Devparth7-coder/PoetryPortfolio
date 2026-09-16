import { z } from "zod";
import { ok } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { executeJob } from "@/application/import/import-service";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const POST = adminHandler<{ params: Promise<{ id: string }> }>(async (req, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); const body = await req.json().catch(() => ({})); const { publish } = z.object({ publish: z.boolean().default(false) }).parse(body); return ok(await executeJob(id, user, { publish })); });
