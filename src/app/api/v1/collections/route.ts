import { handler, ok } from "@/lib/api";
import { listPublicCollections } from "@/application/collections/collection-service";
export const dynamic = "force-dynamic";
export const GET = handler(async () => ok(await listPublicCollections(), { cache: "public, s-maxage=600" }));
