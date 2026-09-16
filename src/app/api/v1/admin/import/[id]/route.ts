import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { getJob } from "@/application/import/import-service";
export const dynamic = "force-dynamic";
export const GET = adminHandler<{ params: Promise<{ id: string }> }>(async (_r, { params }) => { const { id } = await params; z.string().uuid().parse(id); const j = await getJob(id); return j ? ok(j) : fail(404, "not_found", "Import job not found"); });
