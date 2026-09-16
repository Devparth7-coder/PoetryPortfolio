import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { auditLogs, collectionWorks, collections, works } from "@/infrastructure/db/schema";
import { poemListColumns, publicVisible, type PoemListItem } from "@/application/poems/poem-service";
import { slugify, uniqueSlug } from "@/domain/poem/slug";

export async function listPublicCollections() {
  return db.execute<{ id: string; slug: string; title: string; description: string | null; poemCount: number; featuredSlug: string | null; featuredTitle: string | null; coverUrl: string | null; coverAlt: string | null }>(sql`
    SELECT c.id, c.slug, c.title, c.description, m.url AS "coverUrl", m.alt_text AS "coverAlt",
      (SELECT count(*)::int FROM collection_works cw JOIN works w ON w.id = cw.work_id WHERE cw.collection_id = c.id AND w.status='PUBLISHED' AND w.deleted_at IS NULL) AS "poemCount",
      fw.slug AS "featuredSlug", fw.title AS "featuredTitle"
    FROM collections c LEFT JOIN media m ON m.id = c.cover_media_id
    LEFT JOIN works fw ON fw.id = c.featured_work_id AND fw.status='PUBLISHED'
    WHERE c.is_published ORDER BY c.sort_order, c.title`).then((r) => [...r]);
}

export async function getPublicCollection(slug: string) {
  const c = await db.query.collections.findFirst({ where: and(eq(collections.slug, slug), eq(collections.isPublished, true)), with: { cover: true } });
  if (!c) return null;
  const poems = (await db.select(poemListColumns).from(collectionWorks).innerJoin(works, eq(works.id, collectionWorks.workId)).where(and(eq(collectionWorks.collectionId, c.id), publicVisible())).orderBy(asc(collectionWorks.position), desc(works.publishedAt))) as PoemListItem[];
  const featured = c.featuredWorkId ? poems.find((p) => p.id === c.featuredWorkId) ?? poems[0] ?? null : poems[0] ?? null;
  return { ...c, poems, featured };
}

export interface CollectionInput { title: string; description?: string | null; slug?: string; coverMediaId?: string | null; featuredWorkId?: string | null; sortOrder?: number; isPublished?: boolean; poemIds?: string[] }
export async function upsertCollection(id: string | null, input: CollectionInput, actor: { id: string; email: string }) {
  return db.transaction(async (tx) => {
    let row;
    if (id) {
      [row] = await tx.update(collections).set({ title: input.title, description: input.description ?? null, coverMediaId: input.coverMediaId ?? null, featuredWorkId: input.featuredWorkId ?? null, sortOrder: input.sortOrder ?? 0, isPublished: input.isPublished ?? true, updatedAt: new Date() }).where(eq(collections.id, id)).returning();
    } else {
      const taken = new Set((await tx.select({ slug: collections.slug }).from(collections)).map((r) => r.slug));
      [row] = await tx.insert(collections).values({ slug: uniqueSlug(slugify(input.slug ?? input.title), taken), title: input.title, description: input.description ?? null, coverMediaId: input.coverMediaId ?? null, featuredWorkId: input.featuredWorkId ?? null, sortOrder: input.sortOrder ?? 0, isPublished: input.isPublished ?? true }).returning();
    }
    if (input.poemIds) { await tx.delete(collectionWorks).where(eq(collectionWorks.collectionId, row.id)); if (input.poemIds.length) await tx.insert(collectionWorks).values(input.poemIds.map((workId, i) => ({ collectionId: row.id, workId, position: i }))); }
    await tx.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: id ? "collection.update" : "collection.create", entityType: "collection", entityId: row.id, summary: row.title });
    return row;
  });
}
export async function deleteCollection(id: string, actor: { id: string; email: string }) {
  await db.delete(collections).where(eq(collections.id, id));
  await db.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "collection.delete", entityType: "collection", entityId: id });
}
