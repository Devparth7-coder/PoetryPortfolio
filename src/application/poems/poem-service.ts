import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, ne, notInArray, or, sql, SQL } from "drizzle-orm";
import { db, type Db } from "@/infrastructure/db/client";
import { auditLogs, collectionWorks, collections, tags, workSources, workTags, workVersions, works, authors } from "@/infrastructure/db/schema";
import { contentHash, makeExcerpt, normalizedHash, preserveText, stats } from "@/domain/poem/text";
import { slugify, uniqueSlug } from "@/domain/poem/slug";
import type { WorkStatus } from "@/domain/poem/types";

export type Tx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export const publicVisible = () => and(eq(works.status, "PUBLISHED"), isNull(works.deletedAt), eq(works.kind, "POEM"), or(isNull(works.publishAt), lte(works.publishAt, sql`now()`)));

export const poemListColumns = {
  id: works.id, slug: works.slug, title: works.title, excerpt: works.excerpt, language: works.language, publishedAt: works.publishedAt, writtenAt: works.writtenAt,
  readingTimeSeconds: works.readingTimeSeconds, wordCount: works.wordCount, lineCount: works.lineCount, featured: works.featured, trendingAtSource: works.trendingAtSource, status: works.status,
};
export type PoemListItem = { id: string; slug: string; title: string; excerpt: string | null; language: string; publishedAt: Date | null; writtenAt: Date | null; readingTimeSeconds: number; wordCount: number; lineCount: number; featured: boolean; trendingAtSource: boolean; status: WorkStatus };

export async function getAuthor() {
  const a = await db.query.authors.findFirst({ where: eq(authors.slug, "dev-parth") });
  if (!a) throw new Error("Author not seeded");
  return a;
}

export async function getPublishedPoemBySlug(slug: string) {
  const w = await db.query.works.findFirst({
    where: and(eq(works.slug, slug), publicVisible()),
    with: { sources: true, tags: { with: { tag: true }, where: eq(workTags.approved, true) }, collections: { with: { collection: true } }, cover: true, author: true },
  });
  return w ?? null;
}

export async function getAdjacentPoems(publishedAt: Date | null, id: string) {
  if (!publishedAt) return { prev: null, next: null };
  const [prev] = await db.select({ slug: works.slug, title: works.title }).from(works).where(and(publicVisible(), ne(works.id, id), lt(works.publishedAt, publishedAt))).orderBy(desc(works.publishedAt)).limit(1);
  const [next] = await db.select({ slug: works.slug, title: works.title }).from(works).where(and(publicVisible(), ne(works.id, id), gt(works.publishedAt, publishedAt))).orderBy(asc(works.publishedAt)).limit(1);
  return { prev: prev ?? null, next: next ?? null };
}

export async function getRelatedPoems(workId: string, limit = 4): Promise<PoemListItem[]> {
  // Related = shares a collection or tag; fallback to nearest by date.
  const scored = await db.execute<{ id: string }>(sql`
    WITH mine AS (
      SELECT tag_id AS k, 'tag' AS kind FROM work_tags WHERE work_id = ${workId}
      UNION SELECT collection_id, 'col' FROM collection_works WHERE work_id = ${workId}
    )
    SELECT w.id, count(*) AS score FROM works w
      LEFT JOIN work_tags wt ON wt.work_id = w.id
      LEFT JOIN collection_works cw ON cw.work_id = w.id
      JOIN mine ON (mine.kind='tag' AND mine.k = wt.tag_id) OR (mine.kind='col' AND mine.k = cw.collection_id)
      WHERE w.id <> ${workId} AND w.status = 'PUBLISHED' AND w.deleted_at IS NULL AND (w.publish_at IS NULL OR w.publish_at <= now())
      GROUP BY w.id ORDER BY score DESC, random() LIMIT ${limit}`);
  const scoredIds = scored.map((r) => r.id);
  const related = scoredIds.length ? await db.select(poemListColumns).from(works).where(inArray(works.id, scoredIds)) : [];
  if (related.length >= limit) return related as PoemListItem[];
  const fill = await db.select(poemListColumns).from(works).where(and(publicVisible(), ne(works.id, workId), scoredIds.length ? notInArray(works.id, scoredIds) : sql`true`)).orderBy(sql`random()`).limit(limit - related.length);
  return [...(related as PoemListItem[]), ...fill];
}

export interface ListParams { limit?: number; offset?: number; sort?: "newest" | "oldest" | "title" | "mostRead" | "longest" | "shortest" | "random"; language?: string; year?: number; collection?: string; tag?: string; length?: "short" | "medium" | "long"; source?: string; featured?: boolean; status?: WorkStatus | "ALL"; includeDrafts?: boolean }

export async function listPoems(p: ListParams = {}) {
  const limit = Math.min(p.limit ?? 24, 100); const offset = p.offset ?? 0;
  const conds: SQL[] = [];
  if (p.includeDrafts) { conds.push(isNull(works.deletedAt), eq(works.kind, "POEM")); if (p.status && p.status !== "ALL") conds.push(eq(works.status, p.status)); }
  else conds.push(publicVisible()!);
  if (p.language) conds.push(eq(works.language, p.language));
  if (p.year) conds.push(sql`extract(year from coalesce(${works.writtenAt}, ${works.publishedAt})) = ${p.year}`);
  if (p.featured) conds.push(eq(works.featured, true));
  if (p.length === "short") conds.push(lte(works.lineCount, 12));
  if (p.length === "medium") conds.push(and(sql`${works.lineCount} > 12`, lte(works.lineCount, 32))!);
  if (p.length === "long") conds.push(sql`${works.lineCount} > 32`);
  if (p.collection) conds.push(sql`${works.id} IN (SELECT cw.work_id FROM collection_works cw JOIN collections c ON c.id = cw.collection_id WHERE c.slug = ${p.collection})`);
  if (p.tag) conds.push(sql`${works.id} IN (SELECT wt.work_id FROM work_tags wt JOIN tags t ON t.id = wt.tag_id WHERE t.slug = ${p.tag} AND wt.approved)`);
  if (p.source) conds.push(sql`${works.id} IN (SELECT ws.work_id FROM work_sources ws WHERE ws.source = ${p.source})`);
  const where = and(...conds);
  const order = p.sort === "oldest" ? [asc(sql`coalesce(${works.writtenAt}, ${works.publishedAt})`)] : p.sort === "title" ? [asc(works.title)] : p.sort === "longest" ? [desc(works.lineCount)] : p.sort === "shortest" ? [asc(works.lineCount)] : p.sort === "random" ? [sql`random()`]
    : p.sort === "mostRead" ? [desc(sql`(SELECT coalesce(sum(v.views),0) FROM work_views v WHERE v.work_id = ${works.id})`)] : [desc(sql`coalesce(${works.writtenAt}, ${works.publishedAt})`), desc(works.createdAt)];
  const [items, [{ count }]] = await Promise.all([
    db.select(poemListColumns).from(works).where(where).orderBy(...order).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(works).where(where),
  ]);
  return { items: items as PoemListItem[], total: count, limit, offset };
}

export async function getFeaturedPoem() {
  return (await db.select(poemListColumns).from(works).where(and(publicVisible(), eq(works.featured, true))).orderBy(desc(works.publishedAt)).limit(1))[0] ?? (await db.select(poemListColumns).from(works).where(and(publicVisible(), eq(works.trendingAtSource, true))).orderBy(desc(works.publishedAt)).limit(1))[0] ?? null;
}

export async function getArchiveTimeline() {
  const rows = await db.execute<{ year: number; month: number; count: number }>(sql`
    SELECT extract(year from coalesce(written_at, published_at))::int AS year, extract(month from coalesce(written_at, published_at))::int AS month, count(*)::int AS count
    FROM works WHERE status='PUBLISHED' AND deleted_at IS NULL AND kind='POEM' AND coalesce(written_at, published_at) IS NOT NULL
    GROUP BY 1,2 ORDER BY 1 DESC, 2 DESC`);
  const undated = await db.select({ count: sql<number>`count(*)::int` }).from(works).where(and(publicVisible(), isNull(works.writtenAt), isNull(works.publishedAt)));
  const years = new Map<number, { year: number; total: number; months: { month: number; count: number }[] }>();
  for (const r of rows) { const y = years.get(r.year) ?? { year: r.year, total: 0, months: [] }; y.total += r.count; y.months.push({ month: r.month, count: r.count }); years.set(r.year, y); }
  return { years: [...years.values()], undated: undated[0]?.count ?? 0 };
}

export async function getPoemsForYear(year: number) {
  return db.select(poemListColumns).from(works).where(and(publicVisible(), sql`extract(year from coalesce(${works.writtenAt}, ${works.publishedAt})) = ${year}`)).orderBy(desc(sql`coalesce(${works.writtenAt}, ${works.publishedAt})`)) as Promise<PoemListItem[]>;
}

export async function getRandomPoem(exclude: string[] = [], preferTags: string[] = []) {
  const notIn = exclude.length ? sql`${works.slug} NOT IN ${exclude}` : sql`true`;
  if (preferTags.length) {
    const [hit] = await db.select(poemListColumns).from(works).where(and(publicVisible(), notIn, sql`${works.id} IN (SELECT wt.work_id FROM work_tags wt JOIN tags t ON t.id = wt.tag_id WHERE t.slug IN ${preferTags})`)).orderBy(sql`random()`).limit(1);
    if (hit && Math.random() < 0.6) return hit as PoemListItem;
  }
  const [r] = await db.select(poemListColumns).from(works).where(and(publicVisible(), notIn)).orderBy(sql`random()`).limit(1);
  if (r) return r as PoemListItem;
  const [any] = await db.select(poemListColumns).from(works).where(publicVisible()).orderBy(sql`random()`).limit(1);
  return (any as PoemListItem) ?? null;
}

// ---------- Admin write operations (versioned) ----------

export interface PoemInput { title: string; body: string; language?: string; status?: WorkStatus; featured?: boolean; excerpt?: string | null; writtenAt?: Date | null; publishedAt?: Date | null; publishAt?: Date | null; unpublishAt?: Date | null; seoTitle?: string | null; seoDescription?: string | null; tagIds?: string[]; collectionIds?: string[]; coverMediaId?: string | null; metadata?: Record<string, unknown>; slug?: string }

export async function takenSlugs(tx: Tx): Promise<Set<string>> {
  const rows = await tx.select({ slug: works.slug }).from(works).where(eq(works.kind, "POEM"));
  return new Set(rows.map((r) => r.slug));
}

export function computeDerived(title: string, rawBody: string) {
  const body = preserveText(rawBody);
  return { body, ...stats(body), contentHash: contentHash(title, body), normalizedHash: normalizedHash(title, body), autoExcerpt: makeExcerpt(body) };
}

export async function createPoem(input: PoemInput, actor: { id: string; email: string }, opts: { versionKind?: "ORIGINAL" | "EDITED"; tx?: Tx; changeNote?: string } = {}) {
  const run = async (tx: Tx) => {
    const author = await tx.query.authors.findFirst({ where: eq(authors.slug, "dev-parth") });
    if (!author) throw new Error("Author missing");
    const d = computeDerived(input.title, input.body);
    const slug = uniqueSlug(input.slug ?? slugify(input.title), await takenSlugs(tx));
    const status = input.status ?? "DRAFT";
    const [w] = await tx.insert(works).values({
      authorId: author.id, slug, title: input.title, body: d.body, excerpt: input.excerpt ?? d.autoExcerpt, language: input.language ?? "en", status, featured: input.featured ?? false,
      wordCount: d.wordCount, characterCount: d.characterCount, lineCount: d.lineCount, readingTimeSeconds: d.readingTimeSeconds, contentHash: d.contentHash, normalizedHash: d.normalizedHash,
      writtenAt: input.writtenAt ?? null, publishedAt: input.publishedAt ?? (status === "PUBLISHED" ? input.writtenAt ?? new Date() : null), publishAt: input.publishAt ?? null, unpublishAt: input.unpublishAt ?? null,
      seoTitle: input.seoTitle ?? null, seoDescription: input.seoDescription ?? null, coverMediaId: input.coverMediaId ?? null, metadata: input.metadata ?? {}, createdBy: actor.id, updatedBy: actor.id,
    }).returning();
    await tx.insert(workVersions).values({ workId: w.id, version: 1, kind: opts.versionKind ?? "ORIGINAL", title: w.title, body: w.body, language: w.language, contentHash: w.contentHash, changeNote: opts.changeNote ?? "Original", createdBy: actor.id, snapshot: { status: w.status } });
    if (input.tagIds?.length) await tx.insert(workTags).values(input.tagIds.map((tagId) => ({ workId: w.id, tagId }))).onConflictDoNothing();
    if (input.collectionIds?.length) await tx.insert(collectionWorks).values(input.collectionIds.map((collectionId, i) => ({ collectionId, workId: w.id, position: i }))).onConflictDoNothing();
    await tx.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "poem.create", entityType: "work", entityId: w.id, summary: `Created “${w.title}”` });
    return w;
  };
  return opts.tx ? run(opts.tx) : db.transaction(run);
}

export async function updatePoem(id: string, input: Partial<PoemInput>, actor: { id: string; email: string }, changeNote?: string) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.works.findFirst({ where: eq(works.id, id) });
    if (!existing) throw new NotFoundError("Poem not found");
    const title = input.title ?? existing.title; const bodyIn = input.body ?? existing.body;
    const d = computeDerived(title, bodyIn);
    const textChanged = d.contentHash !== existing.contentHash || (input.language && input.language !== existing.language);
    const nextVersion = textChanged ? existing.version + 1 : existing.version;
    const status = input.status ?? existing.status;
    let publishedAt = input.publishedAt !== undefined ? input.publishedAt : existing.publishedAt;
    if (status === "PUBLISHED" && !publishedAt) publishedAt = input.writtenAt ?? existing.writtenAt ?? new Date();
    const slug = input.slug && input.slug !== existing.slug ? uniqueSlug(slugify(input.slug), await takenSlugs(tx)) : existing.slug;
    const [w] = await tx.update(works).set({
      title, body: d.body, slug, excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt && existing.excerpt !== makeExcerpt(existing.body) ? existing.excerpt : d.autoExcerpt,
      language: input.language ?? existing.language, status, featured: input.featured ?? existing.featured,
      wordCount: d.wordCount, characterCount: d.characterCount, lineCount: d.lineCount, readingTimeSeconds: d.readingTimeSeconds, contentHash: d.contentHash, normalizedHash: d.normalizedHash, version: nextVersion,
      writtenAt: input.writtenAt !== undefined ? input.writtenAt : existing.writtenAt, publishedAt, publishAt: input.publishAt !== undefined ? input.publishAt : existing.publishAt, unpublishAt: input.unpublishAt !== undefined ? input.unpublishAt : existing.unpublishAt,
      seoTitle: input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle, seoDescription: input.seoDescription !== undefined ? input.seoDescription : existing.seoDescription,
      coverMediaId: input.coverMediaId !== undefined ? input.coverMediaId : existing.coverMediaId, metadata: input.metadata ? { ...existing.metadata, ...input.metadata } : existing.metadata,
      updatedAt: new Date(), updatedBy: actor.id,
    }).where(eq(works.id, id)).returning();
    if (textChanged) await tx.insert(workVersions).values({ workId: id, version: nextVersion, kind: status === "PUBLISHED" ? "PUBLISHED" : "EDITED", title, body: d.body, language: w.language, contentHash: d.contentHash, changeNote: changeNote ?? "Edited", createdBy: actor.id, snapshot: { status } });
    if (input.tagIds) { await tx.delete(workTags).where(and(eq(workTags.workId, id), eq(workTags.origin, "EDITORIAL"))); if (input.tagIds.length) await tx.insert(workTags).values(input.tagIds.map((tagId) => ({ workId: id, tagId }))).onConflictDoNothing(); }
    if (input.collectionIds) { await tx.delete(collectionWorks).where(eq(collectionWorks.workId, id)); if (input.collectionIds.length) await tx.insert(collectionWorks).values(input.collectionIds.map((collectionId, i) => ({ collectionId, workId: id, position: i }))); }
    await tx.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: textChanged ? "poem.edit" : "poem.update", entityType: "work", entityId: id, summary: `${textChanged ? "Edited text of" : "Updated"} “${title}”${existing.status !== status ? ` (${existing.status} → ${status})` : ""}`, diff: { status: [existing.status, status], version: [existing.version, nextVersion] } });
    return w;
  });
}

export async function restoreVersion(workId: string, versionId: string, actor: { id: string; email: string }) {
  const v = await db.query.workVersions.findFirst({ where: and(eq(workVersions.id, versionId), eq(workVersions.workId, workId)) });
  if (!v) throw new NotFoundError("Version not found");
  return updatePoem(workId, { title: v.title, body: v.body, language: v.language }, actor, `Restored version ${v.version}`);
}

export async function softDeletePoem(id: string, actor: { id: string; email: string }) {
  await db.transaction(async (tx) => {
    const [w] = await tx.update(works).set({ deletedAt: new Date(), status: "ARCHIVED", updatedBy: actor.id }).where(eq(works.id, id)).returning({ title: works.title });
    if (!w) throw new NotFoundError("Poem not found");
    await tx.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "poem.archive", entityType: "work", entityId: id, summary: `Archived “${w.title}”` });
  });
}

export async function getAdminPoem(id: string) {
  return db.query.works.findFirst({ where: eq(works.id, id), with: { versions: { orderBy: desc(workVersions.version) }, sources: true, tags: { with: { tag: true } }, collections: { with: { collection: true } }, cover: true } });
}

export async function listTags() { return db.select().from(tags).orderBy(asc(tags.name)); }
export async function listCollectionsForAdmin() { return db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.title)); }

/** Scheduled publishing: flips REVIEW/DRAFT → PUBLISHED at publishAt, PUBLISHED → ARCHIVED at unpublishAt. Called by a cron route. */
export async function runScheduledPublishing() {
  const now = new Date();
  const published = await db.update(works).set({ status: "PUBLISHED", publishedAt: sql`coalesce(${works.publishedAt}, ${works.publishAt})`, publishAt: null, updatedAt: now })
    .where(and(inArray(works.status, ["DRAFT", "REVIEW"]), lte(works.publishAt, now), isNull(works.deletedAt))).returning({ id: works.id, title: works.title });
  const unpublished = await db.update(works).set({ status: "ARCHIVED", unpublishAt: null, updatedAt: now })
    .where(and(eq(works.status, "PUBLISHED"), lte(works.unpublishAt, now))).returning({ id: works.id, title: works.title });
  if (published.length || unpublished.length) await db.insert(auditLogs).values({ action: "schedule.run", entityType: "system", summary: `Published ${published.length}, unpublished ${unpublished.length}`, diff: { published, unpublished } });
  return { published, unpublished };
}

export async function listSourcesForPoems(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(workSources).where(inArray(workSources.workId, ids));
}

export class NotFoundError extends Error { status = 404; }
