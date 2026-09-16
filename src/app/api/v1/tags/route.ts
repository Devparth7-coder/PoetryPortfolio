import { handler, ok } from "@/lib/api";
import { listTags } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
export const GET = handler(async () => ok((await listTags()).map((t) => ({ slug: t.slug, name: t.name, kind: t.kind })), { cache: "public, s-maxage=600" }));
