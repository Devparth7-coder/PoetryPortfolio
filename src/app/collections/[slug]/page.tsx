import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getPublicCollection, listPublicCollections } from "@/application/collections/collection-service";
import { PoemList, PoemTeaser } from "@/components/poem/poem-list";
import { db } from "@/infrastructure/db/client"; import { works } from "@/infrastructure/db/schema"; import { eq } from "drizzle-orm";
import { plural } from "@/lib/format";
import { SITE, abs } from "@/lib/site";
export const revalidate = 600;
export async function generateStaticParams() { return (await listPublicCollections()).map((c) => ({ slug: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const c = await getPublicCollection(slug); if (!c) return { title: "Collection not found" }; return { title: c.title, description: c.description ?? `Poems by Dev Parth about ${c.title.toLowerCase()}.`, alternates: { canonical: `/collections/${c.slug}` }, openGraph: { title: `${c.title} — Dev Parth`, description: c.description ?? undefined, images: [{ url: `/og?title=${encodeURIComponent(c.title)}&sub=${encodeURIComponent("A collection")}`, width: 1200, height: 630 }] } }; }
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const c = await getPublicCollection(slug); if (!c) notFound();
  const featuredBody = c.featured ? (await db.select({ body: works.body }).from(works).where(eq(works.id, c.featured.id)))[0]?.body ?? "" : "";
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: c.title, description: c.description, url: abs(`/collections/${c.slug}`), isPartOf: { "@type": "WebSite", name: SITE.title, url: SITE.url }, author: { "@type": "Person", name: "Dev Parth" }, hasPart: c.poems.slice(0, 50).map((p) => ({ "@type": "Poem", name: p.title, url: abs(`/poems/${p.slug}`) })) };
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-14">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <p className="eyebrow"><Link href="/collections" className="link">Collections</Link></p>
        <h1 className="mt-3 font-display text-[2.6rem] sm:text-[3.6rem] leading-[1.05] tracking-tight">{c.title}</h1>
        {c.description && <p className="mt-4 max-w-xl font-body text-[1.2rem] italic text-ink-2">{c.description}</p>}
        <p className="mt-3 font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">{plural(c.poems.length, "poem")}</p>
        {c.poems.length === 0 ? <p className="mt-16 font-body italic text-ink-3">This collection is empty for now.</p> : (
          <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_1fr]">
            {c.featured && <PoemTeaser p={c.featured} body={featuredBody} label="Begin here" />}
            <div><p className="eyebrow mb-2">In this collection</p><PoemList poems={c.poems} showYear /></div>
          </div>)}
      </main>
      <SiteFooter />
    </>
  );
}
