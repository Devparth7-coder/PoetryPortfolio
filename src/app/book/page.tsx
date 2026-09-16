import Link from "next/link";
import { listPoems, getArchiveTimeline } from "@/application/poems/poem-service";
import { listPublicCollections } from "@/application/collections/collection-service";
import { db } from "@/infrastructure/db/client"; import { settings } from "@/infrastructure/db/schema"; import { eq } from "drizzle-orm";
import { plural } from "@/lib/format";
export const revalidate = 600;
export default async function BookCover() {
  const [{ items }, cols, timeline, book] = await Promise.all([listPoems({ limit: 100, sort: "oldest" }), listPublicCollections(), getArchiveTimeline(), db.query.settings.findFirst({ where: eq(settings.key, "book") })]);
  const meta = (book?.value ?? {}) as { title?: string; subtitle?: string; dedication?: string };
  const total = timeline.years.reduce((s, y) => s + y.total, 0) + timeline.undated;
  const all = await listPoems({ limit: 100, offset: 100, sort: "oldest" }); const toc = [...items, ...all.items];
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <nav className="mb-10 flex justify-between font-ui text-[0.7rem] uppercase tracking-[0.16em] text-ink-3"><Link href="/" className="link">← Leave the book</Link><span>Book mode</span></nav>
      {/* Cover */}
      <section className="book-page mx-auto aspect-[3/4] max-w-md flex flex-col items-center justify-between p-10 text-center">
        <p className="eyebrow">Poems</p>
        <div><h1 className="font-display font-light text-[3rem] leading-none tracking-tight">{meta.title || "Inkscapes"}</h1><p className="mt-4 font-body italic text-[1.15rem] text-ink-2">{meta.subtitle || "Poetry by Dev Parth"}</p></div>
        <p className="font-display tracking-[0.3em] uppercase text-sm">Dev Parth</p>
      </section>
      {/* Title page */}
      <section className="mt-16 text-center"><p className="eyebrow">Title page</p><h2 className="mt-4 font-display text-[2.2rem] tracking-tight">{meta.title || "Inkscapes"}</h2><p className="mt-2 font-body italic text-ink-2">{plural(total, "poem")} · {timeline.years.at(-1)?.year}–{timeline.years[0]?.year}</p><p className="mt-6 font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">A personal archive · Collected from My Poetic Side and Poetry.com</p></section>
      {meta.dedication && <section className="mt-16 text-center"><p className="eyebrow">Dedication</p><p className="mt-4 mx-auto max-w-sm font-body italic text-[1.2rem] leading-relaxed whitespace-pre-wrap">{meta.dedication}</p></section>}
      {/* Contents */}
      <section className="mt-20">
        <h2 className="eyebrow text-center">Contents</h2>
        {cols.filter((c) => c.poemCount > 0).length > 0 && <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 font-ui text-[0.78rem]">{cols.filter((c) => c.poemCount > 0).map((c) => <Link key={c.id} href={`/collections/${c.slug}`} className="link text-ink-2">{c.title}</Link>)}</div>}
        <ol className="mt-8 font-body text-[1.05rem]">{toc.map((p, i) => (<li key={p.id} className="flex items-baseline gap-2 py-1.5"><span className="font-ui text-[0.68rem] tabular-nums text-ink-3 w-8">{i + 1}</span><Link href={`/book/${encodeURIComponent(p.slug)}`} className="hover:text-accent transition-colors" lang={p.language.split("-")[0]}>{p.title}</Link><span className="flex-1 border-b border-dotted rule mx-1 translate-y-[-4px]" aria-hidden="true" /><span className="font-ui text-[0.68rem] tabular-nums text-ink-3">{(p.writtenAt ?? p.publishedAt)?.getUTCFullYear() ?? ""}</span></li>))}</ol>
        {toc[0] && <p className="mt-10 text-center font-ui text-[0.78rem] uppercase tracking-[0.16em]"><Link href={`/book/${encodeURIComponent(toc[0].slug)}`} className="rounded-sm border border-ink px-6 py-3 hover:bg-ink hover:text-paper transition-colors">Open to the first page</Link></p>}
      </section>
    </main>
  );
}
