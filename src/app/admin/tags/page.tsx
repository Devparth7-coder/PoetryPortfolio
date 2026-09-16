import { listTags } from "@/application/poems/poem-service";
import { db } from "@/infrastructure/db/client"; import { workTags } from "@/infrastructure/db/schema"; import { sql } from "drizzle-orm";
import { PageTitle } from "@/components/admin/ui";
import { TagsManager } from "@/components/admin/tags-manager";
export default async function AdminTags() {
  const tags = await listTags(); const counts = await db.select({ tagId: workTags.tagId, n: sql<number>`count(*)::int` }).from(workTags).groupBy(workTags.tagId);
  return (<><PageTitle eyebrow="Curation" title="Tags" /><p className="mb-6 max-w-2xl font-ui text-sm text-ink-2">Themes and moods. Tags marked <em>source-genre</em> were carried over from Poetry.com genres.</p><TagsManager tags={tags.map((t) => ({ ...t, count: counts.find((c) => c.tagId === t.id)?.n ?? 0 }))} /></>);
}
