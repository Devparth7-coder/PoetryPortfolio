import { z } from "zod";
import { ok } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { rejectJob } from "@/application/import/import-service";
export const dynamic = "force-dynamic";
export const POST = adminHandler<{ params: Promise<{ id: string }> }>(async (_r, { params }, user) => { const { id } = await params; z.string().uuid().parse(id); await rejectJob(id, user); return ok({ rejected: true }); });
