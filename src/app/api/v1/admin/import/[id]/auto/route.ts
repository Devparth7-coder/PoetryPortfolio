import { z } from "zod";
import { ok } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { autoResolveSafe, getJob } from "@/application/import/import-service";
export const dynamic = "force-dynamic";
/** Marks NEW → create and exact duplicates → merge-source. Conflicts and low-confidence items remain for manual review. */
export const POST = adminHandler<{ params: Promise<{ id: string }> }>(async (_r, { params }) => { const { id } = await params; z.string().uuid().parse(id); await autoResolveSafe(id); return ok(await getJob(id)); });
