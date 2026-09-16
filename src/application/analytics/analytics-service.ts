import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { workFavorites, workShares, workViews } from "@/infrastructure/db/schema";

const today = () => new Date().toISOString().slice(0, 10);

/** Aggregated counters only — no per-visitor rows, no IPs, no user agents. */
export async function recordView(workId: string, completed = false) {
  await db.insert(workViews).values({ workId, day: today(), views: 1, completions: completed ? 1 : 0 })
    .onConflictDoUpdate({ target: [workViews.workId, workViews.day], set: { views: sql`${workViews.views} + 1`, completions: sql`${workViews.completions} + ${completed ? 1 : 0}` } });
}
export async function recordCompletion(workId: string) {
  await db.insert(workViews).values({ workId, day: today(), views: 0, completions: 1 })
    .onConflictDoUpdate({ target: [workViews.workId, workViews.day], set: { completions: sql`${workViews.completions} + 1` } });
}
export async function recordFavorite(workId: string, delta: 1 | -1) {
  await db.insert(workFavorites).values({ workId, day: today(), count: Math.max(0, delta) })
    .onConflictDoUpdate({ target: [workFavorites.workId, workFavorites.day], set: { count: sql`greatest(${workFavorites.count} + ${delta}, 0)` } });
}
export async function recordShare(workId: string, channel: string) {
  await db.insert(workShares).values({ workId, channel: channel.slice(0, 30), day: today(), count: 1 })
    .onConflictDoUpdate({ target: [workShares.workId, workShares.channel, workShares.day], set: { count: sql`${workShares.count} + 1` } });
}

export async function getDashboardStats() {
  const [totals] = await db.execute<{ total: number; published: number; drafts: number; review: number; archived: number; words: number; chars: number; languages: number; collections: number; tags: number }>(sql`
    SELECT count(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
      count(*) FILTER (WHERE status='PUBLISHED' AND deleted_at IS NULL)::int AS published,
      count(*) FILTER (WHERE status='DRAFT' AND deleted_at IS NULL)::int AS drafts,
      count(*) FILTER (WHERE status='REVIEW' AND deleted_at IS NULL)::int AS review,
      count(*) FILTER (WHERE status='ARCHIVED' OR deleted_at IS NOT NULL)::int AS archived,
      coalesce(sum(word_count) FILTER (WHERE deleted_at IS NULL),0)::int AS words,
      coalesce(sum(character_count) FILTER (WHERE deleted_at IS NULL),0)::int AS chars,
      count(DISTINCT language) FILTER (WHERE deleted_at IS NULL)::int AS languages,
      (SELECT count(*)::int FROM collections) AS collections,
      (SELECT count(*)::int FROM tags) AS tags
    FROM works WHERE kind='POEM'`);
  const byYear = await db.execute<{ year: number; count: number }>(sql`SELECT extract(year from coalesce(written_at, published_at))::int AS year, count(*)::int FROM works WHERE deleted_at IS NULL AND coalesce(written_at, published_at) IS NOT NULL GROUP BY 1 ORDER BY 1`);
  const byMonth = await db.execute<{ month: string; count: number }>(sql`SELECT to_char(coalesce(written_at, published_at), 'YYYY-MM') AS month, count(*)::int FROM works WHERE deleted_at IS NULL AND coalesce(written_at, published_at) IS NOT NULL GROUP BY 1 ORDER BY 1`);
  const byLanguage = await db.execute<{ language: string; count: number }>(sql`SELECT language, count(*)::int FROM works WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`);
  const mostRead = await db.execute<{ id: string; title: string; slug: string; views: number; completions: number }>(sql`SELECT w.id, w.title, w.slug, sum(v.views)::int AS views, sum(v.completions)::int AS completions FROM work_views v JOIN works w ON w.id = v.work_id GROUP BY w.id ORDER BY views DESC LIMIT 10`);
  const mostFavorited = await db.execute<{ id: string; title: string; slug: string; count: number }>(sql`SELECT w.id, w.title, w.slug, sum(f.count)::int AS count FROM work_favorites f JOIN works w ON w.id = f.work_id GROUP BY w.id ORDER BY count DESC LIMIT 10`);
  const mostShared = await db.execute<{ id: string; title: string; slug: string; count: number }>(sql`SELECT w.id, w.title, w.slug, sum(s.count)::int AS count FROM work_shares s JOIN works w ON w.id = s.work_id GROUP BY w.id ORDER BY count DESC LIMIT 10`);
  const [completion] = await db.execute<{ views: number; completions: number }>(sql`SELECT coalesce(sum(views),0)::int AS views, coalesce(sum(completions),0)::int AS completions FROM work_views`);
  const searches = await db.execute<{ query: string; count: number; avgResults: number }>(sql`SELECT query, count(*)::int AS count, avg(result_count)::int AS "avgResults" FROM search_queries GROUP BY query ORDER BY count DESC LIMIT 15`);
  const themes = await db.execute<{ name: string; slug: string; count: number }>(sql`SELECT t.name, t.slug, count(*)::int FROM work_tags wt JOIN tags t ON t.id = wt.tag_id JOIN works w ON w.id = wt.work_id WHERE w.status='PUBLISHED' GROUP BY t.id ORDER BY count DESC LIMIT 15`);
  const collectionsTop = await db.execute<{ title: string; slug: string; count: number }>(sql`SELECT c.title, c.slug, count(cw.work_id)::int FROM collections c LEFT JOIN collection_works cw ON cw.collection_id = c.id GROUP BY c.id ORDER BY count DESC`);
  const viewsByDay = await db.execute<{ day: string; views: number }>(sql`SELECT day, sum(views)::int AS views FROM work_views WHERE day >= to_char(now() - interval '30 days','YYYY-MM-DD') GROUP BY day ORDER BY day`);
  return { totals, byYear: [...byYear], byMonth: [...byMonth], byLanguage: [...byLanguage], mostRead: [...mostRead], mostFavorited: [...mostFavorited], mostShared: [...mostShared], completion, searches: [...searches], themes: [...themes], collections: [...collectionsTop], viewsByDay: [...viewsByDay] };
}

type QualityCounts = { imported: number; published: number; withSource: number; missingSource: number; missingDates: number; missingLanguage: number; missingExcerpt: number; uncategorised: number; multiSource: number; conflictingVersions: number; openConflicts: number; lowConfidence: number; openDuplicates: number; pendingReview: number; publicDuplicateGroups: number; [k: string]: number };
export async function getDataQuality() {
  const [q] = await db.execute<QualityCounts>(sql`
    SELECT
      (SELECT count(*)::int FROM works WHERE kind='POEM' AND deleted_at IS NULL) AS "imported",
      (SELECT count(*)::int FROM works WHERE kind='POEM' AND deleted_at IS NULL AND status='PUBLISHED') AS "published",
      (SELECT count(DISTINCT work_id)::int FROM work_sources) AS "withSource",
      (SELECT count(*)::int FROM works w WHERE kind='POEM' AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM work_sources s WHERE s.work_id = w.id)) AS "missingSource",
      (SELECT count(*)::int FROM works WHERE kind='POEM' AND deleted_at IS NULL AND written_at IS NULL AND published_at IS NULL) AS "missingDates",
      (SELECT count(*)::int FROM works WHERE kind='POEM' AND deleted_at IS NULL AND (language IS NULL OR language='und')) AS "missingLanguage",
      (SELECT count(*)::int FROM works WHERE kind='POEM' AND deleted_at IS NULL AND (excerpt IS NULL OR excerpt='')) AS "missingExcerpt",
      (SELECT count(*)::int FROM works w WHERE kind='POEM' AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM work_tags t WHERE t.work_id=w.id) AND NOT EXISTS (SELECT 1 FROM collection_works c WHERE c.work_id=w.id)) AS "uncategorised",
      (SELECT count(*)::int FROM works w WHERE kind='POEM' AND deleted_at IS NULL AND (SELECT count(*) FROM work_sources s WHERE s.work_id=w.id) > 1) AS "multiSource",
      (SELECT count(*)::int FROM works w WHERE kind='POEM' AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM work_versions v WHERE v.work_id=w.id AND v.kind='SOURCE_VARIANT')) AS "conflictingVersions",
      (SELECT count(*)::int FROM import_items WHERE status IN ('CONFLICT')) AS "openConflicts",
      (SELECT count(*)::int FROM import_items WHERE status IN ('LOW_CONFIDENCE')) AS "lowConfidence",
      (SELECT count(*)::int FROM import_items WHERE status IN ('DUPLICATE_EXACT','DUPLICATE_LIKELY')) AS "openDuplicates",
      (SELECT count(*)::int FROM import_items WHERE status IN ('NEW','DUPLICATE_EXACT','DUPLICATE_LIKELY','CONFLICT','LOW_CONFIDENCE')) AS "pendingReview",
      (SELECT count(*)::int FROM (SELECT normalized_hash FROM works WHERE deleted_at IS NULL GROUP BY normalized_hash HAVING count(*)>1) d) AS "publicDuplicateGroups"`);
  const bySource = await db.execute<{ source: string; poems: number; canonical: number }>(sql`SELECT source, count(DISTINCT work_id)::int AS poems, count(*) FILTER (WHERE is_canonical)::int AS canonical FROM work_sources GROUP BY source ORDER BY poems DESC`);
  const sourceTotals = await db.execute<{ source: string; extracted: number; jobs: number }>(sql`SELECT source, coalesce(sum((totals->>'extracted')::int),0)::int AS extracted, count(*)::int AS jobs FROM import_jobs GROUP BY source`);
  const flagged = await db.execute<{ id: string; jobId: string; title: string; status: string; flags: string[]; confidence: number; sourceUrl: string | null }>(sql`SELECT id, job_id AS "jobId", title, status, flags, confidence, source_url AS "sourceUrl" FROM import_items WHERE status IN ('CONFLICT','LOW_CONFIDENCE','DUPLICATE_LIKELY') ORDER BY created_at DESC LIMIT 100`);
  const missingDateList = await db.execute<{ id: string; title: string; slug: string }>(sql`SELECT id, title, slug FROM works WHERE kind='POEM' AND deleted_at IS NULL AND written_at IS NULL AND published_at IS NULL LIMIT 50`);
  const undLang = await db.execute<{ id: string; title: string; slug: string }>(sql`SELECT id, title, slug FROM works WHERE kind='POEM' AND deleted_at IS NULL AND language='und' LIMIT 50`);
  return { ...q, bySource: [...bySource], sourceTotals: [...sourceTotals], flagged: [...flagged], missingDateList: [...missingDateList], undLang: [...undLang] };
}
