import { handler, ok, fail } from "@/lib/api";
import { getPublishedPoemBySlug } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
export const GET = handler<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params; const p = await getPublishedPoemBySlug(decodeURIComponent(slug));
  if (!p) return fail(404, "not_found", "Poem not found");
  // Public shape: never leak internal metadata/import ids
  const { id, title, body, excerpt, language, writtenAt, publishedAt, readingTimeSeconds, wordCount, lineCount, featured, trendingAtSource } = p;
  return ok({ id, slug: p.slug, title, body, excerpt, language, writtenAt, publishedAt, readingTimeSeconds, wordCount, lineCount, featured, trendingAtSource, tags: p.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })), collections: p.collections.filter((c) => c.collection.isPublished).map((c) => ({ slug: c.collection.slug, title: c.collection.title })), sources: p.sources.filter((s) => s.sourceUrl && (s.source === "MY_POETIC_SIDE" || s.source === "POETRY_COM")).map((s) => ({ source: s.source, url: s.sourceUrl })) }, { cache: "public, s-maxage=600, stale-while-revalidate=86400" });
}, { limit: { n: 240, windowMs: 60_000 } });
