import { z } from "zod";
import { ok, parseBody } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { restoreVersion } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
export const POST = adminHandler<{ params: Promise<{ id: string }> }>(async (req, { params }, user) => { const { id } = await params; const { versionId } = await parseBody(req, z.object({ versionId: z.string().uuid() })); const w = await restoreVersion(id, versionId, user); return ok({ version: w.version }); });
