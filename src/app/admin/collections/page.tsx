import { listCollectionsForAdmin, listPoems } from "@/application/poems/poem-service";
import { db } from "@/infrastructure/db/client"; import { collectionWorks } from "@/infrastructure/db/schema";
import { PageTitle } from "@/components/admin/ui";
import { CollectionsManager } from "@/components/admin/collections-manager";
export default async function AdminCollections() {
  const [cols, poems, links] = await Promise.all([listCollectionsForAdmin(), listPoems({ includeDrafts: true, limit: 100, sort: "title" }), db.select().from(collectionWorks)]);
  const more = poems.total > 100 ? (await listPoems({ includeDrafts: true, limit: 100, offset: 100, sort: "title" })).items : [];
  const all = [...poems.items, ...more].map((p) => ({ id: p.id, title: p.title, status: p.status }));
  const membership: Record<string, string[]> = {}; for (const l of links) (membership[l.collectionId] ??= []).push(l.workId);
  return (<><PageTitle eyebrow="Curation" title="Collections" /><p className="mb-6 max-w-2xl font-ui text-sm text-ink-2">Collections are editorial. Poems are placed here by hand — nothing is auto-classified.</p><CollectionsManager collections={JSON.parse(JSON.stringify(cols))} poems={all} membership={membership} /></>);
}
