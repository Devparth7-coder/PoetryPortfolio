import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getFeaturedPoem, listPoems, getArchiveTimeline, getAuthor } from "@/application/poems/poem-service";
import { listPublicCollections } from "@/application/collections/collection-service";
import { db } from "@/infrastructure/db/client";
import { works } from "@/infrastructure/db/schema";
import { eq } from "drizzle-orm";
import { PoemList, PoemTeaser } from "@/components/poem/poem-list";
import { SITE } from "@/lib/site";
import { ContinueReading } from "@/components/reading/continue-reading";
import { plural } from "@/lib/format";

export const revalidate = 300;

export default async function HomePage() {
  const [featured, latest, selected, collections, timeline, author] = await Promise.all([
    getFeaturedPoem(), listPoems({ limit: 6 }), listPoems({ limit: 5, sort: "mostRead" }), listPublicCollections(), getArchiveTimeline(), getAuthor(),
  ]);
  const featuredBody = featured ? (await db.select({ body: works.body }).from(works).where(eq(works.id, featured.id)))[0]?.body ?? "" : "";
  const totalPoems = timeline.years.reduce((s, y) => s + y.total, 0) + timeline.undated;
  const selectedWorks = selected.items.filter((p) => p.id !== featured?.id).slice(0, 4);
  const jsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: SITE.title, url: SITE.url, description: SITE.description, author: { "@type": "Person", name: "Dev Parth", url: SITE.url + "/about", sameAs: Object.values(SITE.author.profiles) }, potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: SITE.url + "/poems?q={search_term_string}" }, "query-input": "required name=search_term_string" } };

  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 sm:px-8 pt-16 pb-24 sm:pt-28 sm:pb-32">
          <p className="eyebrow reveal">Poetry archive</p>
          <h1 className="mt-6 font-display font-light text-[2.6rem] leading-[1.02] tracking-tight sm:text-[4.4rem] md:text-[5.2rem] reveal reveal-2">
            Poetry, thoughts,<br />and the things<br /><em className="text-accent">that remained unsaid.</em>
          </h1>
          <p className="mt-8 max-w-md font-body text-[1.15rem] leading-relaxed text-ink-2 reveal reveal-3">{plural(totalPoems, "poem")}, written between {timeline.years.at(-1)?.year} and {timeline.years[0]?.year}. Every one of them is here, exactly as it was written.</p>
          <div className="mt-10 flex flex-wrap items-center gap-6 font-ui text-[0.78rem] uppercase tracking-[0.16em] reveal reveal-4">
            <Link href="/poems" className="rounded-sm border border-ink px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-paper">Read the collection</Link>
            <Link href="/random" className="link text-ink-2">Read something unexpected</Link>
          </div>
        </section>

        <ContinueReading />

        {featured && (
          <section aria-labelledby="featured" className="border-t rule">
            <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 grid gap-12 lg:grid-cols-[1.2fr_.8fr]">
              <h2 id="featured" className="sr-only">Featured poem</h2>
              <PoemTeaser p={featured} body={featuredBody} />
              <aside className="lg:border-l rule lg:pl-12">
                <p className="eyebrow">Selected works</p>
                <ul className="mt-5">{selectedWorks.map((p) => (<li key={p.id} className="border-b rule py-3.5"><Link href={`/poems/${encodeURIComponent(p.slug)}`} className="font-display text-[1.2rem] leading-snug hover:text-accent transition-colors" lang={p.language.split("-")[0]}>{p.title}</Link></li>))}</ul>
                <Link href="/poems?sort=mostRead" className="link mt-5 inline-block font-ui text-[0.72rem] uppercase tracking-[0.16em] text-ink-3">Most read →</Link>
              </aside>
            </div>
          </section>
        )}

        <section aria-labelledby="archive" className="border-t rule bg-paper-2/60">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div><p className="eyebrow">The archive</p><h2 id="archive" className="mt-3 font-display text-[2rem] sm:text-[2.6rem] leading-tight tracking-tight">Every year, every month.</h2></div>
              <Link href="/archive" className="link font-ui text-[0.72rem] uppercase tracking-[0.16em] text-ink-2">Explore the timeline →</Link>
            </div>
            <ol className="mt-10 grid gap-x-8 gap-y-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {timeline.years.map((y) => (
                <li key={y.year}><Link href={`/archive/${y.year}`} className="group block border-t border-ink/60 pt-3"><span className="font-display text-[2.2rem] leading-none group-hover:text-accent transition-colors">{y.year}</span><span className="mt-1 block font-ui text-[0.7rem] uppercase tracking-[0.14em] text-ink-3">{plural(y.total, "poem")}</span></Link></li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="collections" className="border-t rule">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20">
            <p className="eyebrow">Collections</p>
            <h2 id="collections" className="mt-3 font-display text-[2rem] sm:text-[2.6rem] leading-tight tracking-tight">Read by feeling.</h2>
            <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {collections.filter((c) => c.poemCount > 0).map((c) => (
                <li key={c.id} className="border-b rule"><Link href={`/collections/${c.slug}`} className="flex items-baseline justify-between gap-4 py-3.5 group"><span className="font-display text-[1.25rem] group-hover:text-accent transition-colors">{c.title}</span><span className="font-ui text-[0.7rem] tabular-nums text-ink-3">{c.poemCount}</span></Link></li>
              ))}
            </ul>
            {collections.every((c) => c.poemCount === 0) && <p className="mt-6 font-body italic text-ink-3">Collections are curated by hand and will appear here as the archive is organised.</p>}
          </div>
        </section>

        <section aria-labelledby="latest" className="border-t rule">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div><p className="eyebrow">Latest writing</p><h2 id="latest" className="mt-3 font-display text-[2rem] sm:text-[2.6rem] leading-tight tracking-tight">Recently added.</h2><Link href="/poems" className="link mt-6 inline-block font-ui text-[0.72rem] uppercase tracking-[0.16em] text-ink-2">All poems →</Link></div>
            <PoemList poems={latest.items} />
          </div>
        </section>

        <section aria-labelledby="about" className="border-t rule bg-paper-2/60">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 py-20 grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="eyebrow">About the poet</p>
              <h2 id="about" className="mt-3 font-display text-[2rem] sm:text-[2.6rem] leading-tight tracking-tight">I write what people remember at midnight.</h2>
            </div>
            <div className="font-body text-[1.1rem] leading-relaxed text-ink-2">
              <p>{author.bio}</p>
              <p className="mt-4">{author.statement}</p>
              <p className="mt-6 font-ui text-[0.78rem] uppercase tracking-[0.16em]"><Link href="/about" className="link text-ink">Read more</Link><span className="mx-3 text-ink-3">·</span><a href={SITE.author.profiles.myPoeticSide} className="link text-ink-3" rel="me noopener" target="_blank">My Poetic Side</a><span className="mx-3 text-ink-3">·</span><a href={SITE.author.profiles.poetryCom} className="link text-ink-3" rel="me noopener" target="_blank">Poetry.com</a></p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
