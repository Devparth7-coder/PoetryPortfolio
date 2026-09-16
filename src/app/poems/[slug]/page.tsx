import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getAdjacentPoems, getPublishedPoemBySlug, getRelatedPoems, listPoems } from "@/application/poems/poem-service";
import { formatDate, isoDate, readingTime } from "@/lib/format";
import { languageLabel } from "@/domain/poem/language";
import { SITE, abs, poemPath } from "@/lib/site";
import { SOURCE_LABELS, type SourceKind } from "@/domain/poem/types";
import { PoemReader } from "@/components/reading/poem-reader";
import { PoemList } from "@/components/poem/poem-list";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { items } = await listPoems({ limit: 100 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const poem = await getPublishedPoemBySlug(decodeURIComponent(slug));
  if (!poem) return { title: "Poem not found" };
  const title = poem.seoTitle ?? poem.title;
  const description = poem.seoDescription ?? (poem.excerpt ? `${poem.excerpt} — a poem by Dev Parth.` : `“${poem.title}”, a poem by Dev Parth.`);
  const url = abs(poemPath(poem.slug));
  const og = `/og/poem/${encodeURIComponent(poem.slug)}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "article", url, title: `${title} — Dev Parth`, description, siteName: SITE.title, locale: SITE.locale, publishedTime: isoDate(poem.publishedAt), modifiedTime: isoDate(poem.updatedAt), authors: [abs("/about")], images: [{ url: og, width: 1200, height: 630, alt: `${poem.title} — Dev Parth` }] },
    twitter: { card: "summary_large_image", title: `${title} — Dev Parth`, description, images: [og] },
    other: { "article:author": "Dev Parth" },
  };
}

export default async function PoemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const poem = await getPublishedPoemBySlug(decodeURIComponent(slug));
  if (!poem) notFound();
  const [adjacent, related] = await Promise.all([getAdjacentPoems(poem.writtenAt ?? poem.publishedAt, poem.id), getRelatedPoems(poem.id, 4)]);
  const date = poem.writtenAt ?? poem.publishedAt;
  const lang = poem.language.split("-")[0];
  const url = abs(poemPath(poem.slug));
  const publicSources = poem.sources.filter((s) => s.source === "MY_POETIC_SIDE" || s.source === "POETRY_COM").filter((s) => s.sourceUrl);
  const collections = poem.collections.map((c) => c.collection).filter((c) => c.isPublished);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Poem", name: poem.title, headline: poem.title, url,
    author: { "@type": "Person", name: "Dev Parth", url: abs("/about"), sameAs: Object.values(SITE.author.profiles) },
    ...(date ? { datePublished: date.toISOString() } : {}), dateModified: poem.updatedAt.toISOString(),
    inLanguage: poem.language, genre: "Poetry", wordCount: poem.wordCount, isAccessibleForFree: true,
    ...(poem.excerpt ? { abstract: poem.excerpt } : {}),
    ...(publicSources.length ? { sameAs: publicSources.map((s) => s.sourceUrl) } : {}),
    ...(poem.tags.length ? { keywords: poem.tags.map((t) => t.tag.name).join(", ") } : {}),
    isPartOf: { "@type": "WebSite", name: SITE.title, url: SITE.url },
  };

  return (
    <>
      <SiteHeader minimal />
      <main id="main" className="relative z-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <PoemReader slug={poem.slug} title={poem.title} id={poem.id} prev={adjacent.prev} next={adjacent.next} url={url}>
          <article className="mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-16" lang={lang}>
            <header className="mx-auto" style={{ maxWidth: "calc(var(--read-width) + 6rem)" }}>
              <nav aria-label="Breadcrumb" className="no-print font-ui text-[0.7rem] uppercase tracking-[0.16em] text-ink-3" lang="en">
                <Link href="/poems" className="link">Poems</Link>{collections[0] && (<><span className="mx-2">/</span><Link href={`/collections/${collections[0].slug}`} className="link">{collections[0].title}</Link></>)}
              </nav>
              <h1 className="mt-6 font-display font-normal text-[2.3rem] leading-[1.08] tracking-tight sm:text-[3.4rem]">{poem.title}</h1>
              <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-3" lang="en">
                <span className="text-ink-2">Dev Parth</span>
                {date && (<><span aria-hidden="true">·</span><time dateTime={date.toISOString()}>{formatDate(date)}</time></>)}
                <span aria-hidden="true">·</span><span>{readingTime(poem.readingTimeSeconds)}</span>
                <span aria-hidden="true">·</span><span>{languageLabel(poem.language)}</span>
                {poem.trendingAtSource && (<><span aria-hidden="true">·</span><span className="text-accent">Trended on My Poetic Side</span></>)}
              </p>
            </header>
            <div className="mx-auto mt-12 sm:mt-16" style={{ maxWidth: "calc(var(--read-width) + 6rem)" }}>
              <div className="poem-body text-ink" data-poem-body>{poem.body}</div>
            </div>
            <footer className="mx-auto mt-16 border-t rule pt-8 font-ui text-[0.8rem] text-ink-3" style={{ maxWidth: "calc(var(--read-width) + 6rem)" }} lang="en">
              {(poem.metadata as { authorNote?: string }).authorNote && (<p className="mb-6 font-body text-[1rem] italic text-ink-2">Author&apos;s note: “{(poem.metadata as { authorNote?: string }).authorNote}”</p>)}
              {poem.tags.length > 0 && (<p className="flex flex-wrap gap-2">{poem.tags.map((t) => <Link key={t.tag.id} href={`/poems?tag=${t.tag.slug}`} className="rounded-full border rule px-3 py-1 text-[0.7rem] uppercase tracking-[0.12em] hover:border-accent hover:text-accent transition-colors">{t.tag.name}</Link>)}</p>)}
              {collections.length > 0 && (<p className="mt-4">In {collections.map((c, i) => (<span key={c.id}>{i > 0 && ", "}<Link href={`/collections/${c.slug}`} className="link text-ink-2">{c.title}</Link></span>))}.</p>)}
              {publicSources.length > 0 && (<p className="mt-4">First published on {publicSources.map((s, i) => (<span key={s.id}>{i > 0 && " and "}<a href={s.sourceUrl!} className="link text-ink-2" rel="noopener nofollow" target="_blank">{SOURCE_LABELS[s.source as SourceKind]}</a>{s.sourcePublishedAt && ` (${formatDate(s.sourcePublishedAt)})`}</span>))}. Archived here exactly as written.</p>)}
              <p className="mt-4 print:block hidden">{url}</p>
            </footer>
            <nav aria-label="Previous and next poem" className="no-print mx-auto mt-16 grid gap-6 border-t rule pt-8 sm:grid-cols-2" style={{ maxWidth: "calc(var(--read-width) + 6rem)" }} lang="en">
              <div>{adjacent.prev && (<Link href={poemPath(adjacent.prev.slug)} rel="prev" className="group block"><span className="eyebrow">← Earlier</span><span className="mt-1 block font-display text-[1.25rem] group-hover:text-accent transition-colors">{adjacent.prev.title}</span></Link>)}</div>
              <div className="sm:text-right">{adjacent.next && (<Link href={poemPath(adjacent.next.slug)} rel="next" className="group block"><span className="eyebrow">Later →</span><span className="mt-1 block font-display text-[1.25rem] group-hover:text-accent transition-colors">{adjacent.next.title}</span></Link>)}</div>
            </nav>
          </article>
        </PoemReader>
        {related.length > 0 && (
          <section aria-labelledby="related" className="no-print mx-auto max-w-6xl px-5 sm:px-8 mt-24 border-t rule pt-12">
            <p className="eyebrow">Keep reading</p>
            <h2 id="related" className="mt-3 font-display text-[1.8rem] tracking-tight">Related poems</h2>
            <div className="mt-6"><PoemList poems={related} /></div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
