import { z } from "zod";
import { ok } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { db } from "@/infrastructure/db/client"; import { workVersions } from "@/infrastructure/db/schema"; import { desc, eq } from "drizzle-orm";
import { diffLines } from "@/domain/poem/similarity";
export const dynamic = "force-dynamic";
export const GET = adminHandler<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params; z.string().uuid().parse(id); const u = new URL(req.url); const a = u.searchParams.get("a"), b = u.searchParams.get("b");
  const versions = await db.select().from(workVersions).where(eq(workVersions.workId, id)).orderBy(desc(workVersions.version));
  if (a && b) { const va = versions.find((v) => v.id === a), vb = versions.find((v) => v.id === b); if (va && vb) return ok({ versions, diff: diffLines(va.body, vb.body), a: va, b: vb }); }
  return ok({ versions });
});
