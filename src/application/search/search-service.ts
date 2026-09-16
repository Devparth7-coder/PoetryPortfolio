import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { searchQueries } from "@/infrastructure/db/schema";
import { logger } from "@/infrastructure/logging/logger";

export interface SearchHit { [k: string]: unknown; id: string; slug: string; title: string; excerpt: string | null; language: string; publishedAt: string | null; writtenAt: string | null; headline: string; rank: number; collection: string | null; collectionSlug: string | null }
export interface SearchResult { query: string; poems: SearchHit[]; collections: { slug: string; title: string }[]; tags: { slug: string; name: string }[]; total: number; tookMs: number }

/** PostgreSQL full-text search (websearch syntax) with trigram fallback for typos & partial titles. No LLM in the hot path. */
export async function searchPoems(rawQuery: string, opts: { limit?: number; offset?: number; log?: boolean } = {}): Promise<SearchResult> {
  const query = rawQuery.trim().slice(0, 200); const limit = Math.min(opts.limit ?? 20, 50); const offset = opts.offset ?? 0;
  const start = performance.now();
  if (!query) return { query, poems: [], collections: [], tags: [], total: 0, tookMs: 0 };
  const poems = await db.execute<SearchHit & { total: number }>(sql`
    WITH q AS (SELECT websearch_to_tsquery('english', immutable_unaccent(${query})) AS tsq, websearch_to_tsquery('simple', immutable_unaccent(${query})) AS tss),
    hits AS (
      SELECT w.id, w.slug, w.title, w.excerpt, w.language, w.published_at, w.written_at,
        GREATEST(ts_rank_cd(w.search_vector, q.tsq), ts_rank_cd(w.search_vector, q.tss)) * 10
          + CASE WHEN lower(w.title) = lower(${query}) THEN 5 WHEN lower(w.title) LIKE lower(${"%" + query + "%"}) THEN 2 ELSE 0 END
          + similarity(lower(w.title), lower(${query})) AS rank,
        (w.search_vector @@ q.tsq OR w.search_vector @@ q.tss) AS fts
      FROM works w, q
      WHERE w.status = 'PUBLISHED' AND w.deleted_at IS NULL AND w.kind = 'POEM' AND (w.publish_at IS NULL OR w.publish_at <= now())
        AND (w.search_vector @@ q.tsq OR w.search_vector @@ q.tss OR lower(w.title) % lower(${query}) OR lower(w.title) LIKE lower(${"%" + query + "%"}) OR w.body ILIKE ${"%" + query + "%"})
    )
    SELECT h.id, h.slug, h.title, h.excerpt, h.language, h.published_at AS "publishedAt", h.written_at AS "writtenAt", h.rank,
      ts_headline('english', immutable_unaccent(w.body), q.tsq, 'StartSel=<mark>, StopSel=</mark>, MaxWords=28, MinWords=12, MaxFragments=1, FragmentDelimiter=" … "') AS headline,
      c.title AS collection, c.slug AS "collectionSlug", count(*) OVER() ::int AS total
    FROM hits h JOIN works w ON w.id = h.id CROSS JOIN q
    LEFT JOIN LATERAL (SELECT c.title, c.slug FROM collection_works cw JOIN collections c ON c.id = cw.collection_id WHERE cw.work_id = h.id AND c.is_published ORDER BY cw.added_at LIMIT 1) c ON true
    ORDER BY h.rank DESC, h.published_at DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`);
  const [collections, tags] = await Promise.all([
    db.execute<{ slug: string; title: string }>(sql`SELECT slug, title FROM collections WHERE is_published AND (lower(title) % lower(${query}) OR lower(title) LIKE lower(${"%" + query + "%"})) ORDER BY similarity(lower(title), lower(${query})) DESC LIMIT 5`),
    db.execute<{ slug: string; name: string }>(sql`SELECT slug, name FROM tags WHERE lower(name) % lower(${query}) OR lower(name) LIKE lower(${"%" + query + "%"}) ORDER BY similarity(lower(name), lower(${query})) DESC LIMIT 6`),
  ]);
  const tookMs = Math.round(performance.now() - start);
  const total = poems[0]?.total ?? 0;
  if (opts.log !== false && query.length >= 2) {
    db.insert(searchQueries).values({ query: query.toLowerCase(), resultCount: total, durationMs: tookMs, day: new Date().toISOString().slice(0, 10) }).catch((e) => logger.warn("search.log.failed", { error: e }));
  }
  return { query, poems: poems.map((p) => ({ ...p, total: undefined }) as unknown as SearchHit), collections: [...collections], tags: [...tags], total, tookMs };
}
