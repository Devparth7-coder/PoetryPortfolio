import { ok, parseBody } from "@/lib/api";
import { adminHandler, CollectionInputSchema } from "@/lib/admin-api";
import { listCollectionsForAdmin } from "@/application/poems/poem-service";
import { upsertCollection } from "@/application/collections/collection-service";
export const dynamic = "force-dynamic";
export const GET = adminHandler(async () => ok(await listCollectionsForAdmin()));
export const POST = adminHandler(async (req, _c, user) => ok(await upsertCollection(null, await parseBody(req, CollectionInputSchema), user), { status: 201 }));
