import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/infrastructure/db/client";
import { works } from "@/infrastructure/db/schema";
import { asc, sql } from "drizzle-orm";
import { getPublishedPoemBySlug, publicVisible } from "@/application/poems/poem-service";
import { BookKeys } from "@/components/reading/book-keys";
import { formatDate } from "@/lib/format";
import type { Metadata } from "next";
export const revalidate = 600;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; return { title: `Book · ${decodeURIComponent(slug)}`, robots: { index: false }, alternates: { canonical: `/poems/${slug}` } }; }
export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const poem = await getPublishedPoemBySlug(decodeURIComponent(slug)); if (!poem) notFound();
  const order = await db.select({ slug: works.slug, title: works.title }).from(works).where(publicVisible()).orderBy(asc(sql`coalesce(${works.writtenAt}, ${works.publishedAt})`), asc(works.createdAt));
  const i = order.findIndex((p) => p.slug === poem.slug); const prev = order[i - 1]; const next = order[i + 1];
  const collection = poem.collections.find((c) => c.collection.isPublished)?.collection;
  const date = poem.writtenAt ?? poem.publishedAt;
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-8 sm:py-14">
      <BookKeys prev={prev?.slug} next={next?.slug} />
      <nav className="flex items-center justify-between font-ui text-[0.68rem] uppercase tracking-[0.16em] text-ink-3"><Link href="/book" className="link">Contents</Link><span>{collection ? <Link href={`/collections/${collection.slug}`} className="link">{collection.title}</Link> : "Poems"}</span><span className="tabular-nums">{i + 1} / {order.length}</span></nav>
      <div className="mt-2 h-px bg-rule"><div className="h-px bg-accent" style={{ width: `${((i + 1) / order.length) * 100}%` }} /></div>
      <article className="book-page mt-8 px-6 py-14 sm:px-16 sm:py-20 min-h-[70dvh]" lang={poem.language.split("-")[0]}>
        <h1 className="font-display text-center text-[2rem] sm:text-[2.6rem] leading-tight tracking-tight">{poem.title}</h1>
        {date && <p className="mt-3 text-center font-ui text-[0.68rem] uppercase tracking-[0.16em] text-ink-3" lang="en">{formatDate(date)}</p>}
        <div className="poem-body mx-auto mt-12 text-[1.15rem]">{poem.body}</div>
        <p className="mt-16 text-center font-display text-ink-3" aria-hidden="true">✦</p>
      </article>
      <nav aria-label="Turn page" className="mt-8 flex items-center justify-between font-ui text-[0.72rem] uppercase tracking-[0.16em]">
        <span>{prev ? <Link href={`/book/${encodeURIComponent(prev.slug)}`} rel="prev" className="link">← {prev.title}</Link> : <Link href="/book" className="link">← Contents</Link>}</span>
        <span className="text-right">{next ? <Link href={`/book/${encodeURIComponent(next.slug)}`} rel="next" className="link">{next.title} →</Link> : <span className="text-ink-3">The end</span>}</span>
      </nav>
      <p className="mt-10 text-center font-ui text-[0.68rem] text-ink-3">← → to turn pages · <Link href={`/poems/${encodeURIComponent(poem.slug)}`} className="link">open on the website</Link></p>
    </main>
  );
}
