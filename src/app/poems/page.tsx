import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { listPoems, listTags, getArchiveTimeline } from "@/application/poems/poem-service";
import { listPublicCollections } from "@/application/collections/collection-service";
import { searchPoems } from "@/application/search/search-service";
import { PoemList } from "@/components/poem/poem-list";
import { languageLabel } from "@/domain/poem/language";
import { db } from "@/infrastructure/db/client";
import { sql } from "drizzle-orm";
import { plural } from "@/lib/format";
import { poemPath } from "@/lib/site";

export const metadata: Metadata = { title: "All poems", description: "Browse and search the complete poetry archive of Dev Parth — by year, language, collection, theme and length.", alternates: { canonical: "/poems" } };
export const revalidate = 120;

type SP = Record<string, string | undefined>;
const PAGE = 24;

export default async function PoemsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? ""; const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = (["newest", "oldest", "title", "mostRead", "longest", "shortest"].includes(sp.sort ?? "") ? sp.sort : "newest") as "newest";
  const filters = { language: sp.lang, year: sp.year ? Number(sp.year) : undefined, collection: sp.collection, tag: sp.tag, length: sp.length as "short" | undefined, source: sp.source, featured: sp.featured === "1" };
  const [collections, tags, timeline, langs] = await Promise.all([listPublicCollections(), listTags(), getArchiveTimeline(), db.execute<{ language: string; count: number }>(sql`SELECT language, count(*)::int FROM works WHERE status='PUBLISHED' AND deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`)]);
  const result = q ? null : await listPoems({ ...filters, sort, limit: PAGE, offset: (page - 1) * PAGE });
  const search = q ? await searchPoems(q, { limit: 50 }) : null;
  const active = Object.entries({ ...filters, sort: sort !== "newest" ? sort : undefined, q: q || undefined }).filter(([, v]) => Boolean(v));
  const href = (patch: Record<string, string | undefined>) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries({ q: sp.q, lang: sp.lang, year: sp.year, collection: sp.collection, tag: sp.tag, length: sp.length, source: sp.source, featured: sp.featured, sort: sp.sort, ...patch })) if (v) u.set(k, v); const s = u.toString(); return `/poems${s ? `?${s}` : ""}`; };
  const total = result?.total ?? search?.total ?? 0; const pages = result ? Math.ceil(result.total / PAGE) : 1;

  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-14">
        <p className="eyebrow">The collection</p>
        <h1 className="mt-3 font-display text-[2.4rem] sm:text-[3.2rem] leading-[1.05] tracking-tight">All poems</h1>
        <form action="/poems" method="get" role="search" className="mt-8 flex max-w-xl items-center gap-2 border-b border-ink/60 pb-2">
          <label htmlFor="q" className="sr-only">Search poems</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search titles, lines, themes…" className="w-full bg-transparent font-body text-[1.2rem] outline-none placeholder:text-ink-3" autoComplete="off" />
          <button type="submit" className="font-ui text-[0.72rem] uppercase tracking-[0.16em] text-ink-2 hover:text-accent">Search</button>
        </form>
        <div className="mt-10 grid gap-12 lg:grid-cols-[15rem_1fr]">
          <aside className="font-ui text-[0.8rem]" aria-label="Filters">
            <FilterGroup title="Sort">{[["newest", "Most recent"], ["oldest", "Oldest"], ["mostRead", "Most read"], ["title", "A–Z"], ["longest", "Longest"], ["shortest", "Shortest"]].map(([k, l]) => <FLink key={k} href={href({ sort: k === "newest" ? undefined : k, page: undefined })} active={sort === k}>{l}</FLink>)}</FilterGroup>
            <FilterGroup title="Year">{timeline.years.map((y) => <FLink key={y.year} href={href({ year: sp.year === String(y.year) ? undefined : String(y.year), page: undefined })} active={sp.year === String(y.year)}>{y.year} <span className="text-ink-3">{y.total}</span></FLink>)}</FilterGroup>
            {langs.length > 1 && <FilterGroup title="Language">{[...langs].map((l) => <FLink key={l.language} href={href({ lang: sp.lang === l.language ? undefined : l.language, page: undefined })} active={sp.lang === l.language}>{languageLabel(l.language)} <span className="text-ink-3">{l.count}</span></FLink>)}</FilterGroup>}
            <FilterGroup title="Length">{[["short", "Short (≤12 lines)"], ["medium", "Medium"], ["long", "Long (32+ lines)"]].map(([k, l]) => <FLink key={k} href={href({ length: sp.length === k ? undefined : k, page: undefined })} active={sp.length === k}>{l}</FLink>)}</FilterGroup>
            {collections.some((c) => c.poemCount > 0) && <FilterGroup title="Collection">{collections.filter((c) => c.poemCount > 0).map((c) => <FLink key={c.id} href={href({ collection: sp.collection === c.slug ? undefined : c.slug, page: undefined })} active={sp.collection === c.slug}>{c.title} <span className="text-ink-3">{c.poemCount}</span></FLink>)}</FilterGroup>}
            {tags.length > 0 && <FilterGroup title="Theme & mood">{tags.map((t) => <FLink key={t.id} href={href({ tag: sp.tag === t.slug ? undefined : t.slug, page: undefined })} active={sp.tag === t.slug}>{t.name}</FLink>)}</FilterGroup>}
            <FilterGroup title="Source">{[["MY_POETIC_SIDE", "My Poetic Side"], ["POETRY_COM", "Poetry.com"], ["ANTHOLOGY", "Anthology"]].map(([k, l]) => <FLink key={k} href={href({ source: sp.source === k ? undefined : k, page: undefined })} active={sp.source === k}>{l}</FLink>)}</FilterGroup>
            <FilterGroup title="Other"><FLink href={href({ featured: sp.featured ? undefined : "1", page: undefined })} active={!!sp.featured}>Featured & trended</FLink></FilterGroup>
          </aside>
          <section aria-live="polite">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b rule pb-3 font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">
              <span>{q ? <>{plural(total, "result")} for <q className="normal-case tracking-normal text-ink">{q}</q>{search && ` · ${search.tookMs} ms`}</> : plural(total, "poem")}</span>
              {active.length > 0 && <Link href="/poems" className="link">Clear all</Link>}
            </div>
            {search ? (
              search.poems.length ? (
                <ul className="list-none">{search.poems.map((h) => (
                  <li key={h.id} className="border-b rule py-5"><Link href={poemPath(h.slug)} className="group block"><h3 className="font-display text-[1.35rem] leading-snug group-hover:text-accent transition-colors" lang={h.language.split("-")[0]}>{h.title}</h3><p className="mt-1 font-body text-[0.98rem] italic text-ink-3 [&_mark]:not-italic" dangerouslySetInnerHTML={{ __html: h.headline || h.excerpt || "" }} /><p className="mt-1.5 font-ui text-[0.68rem] uppercase tracking-[0.14em] text-ink-3">{h.writtenAt ? new Date(h.writtenAt).getUTCFullYear() : ""}{h.collection && ` · ${h.collection}`}</p></Link></li>))}
                </ul>
              ) : (<div className="py-20 text-center"><p className="font-display text-[1.6rem]">Nothing found for “{q}”.</p><p className="mt-3 font-body italic text-ink-3">Try a single word, a feeling, or a line you remember.</p><p className="mt-6 font-ui text-[0.72rem] uppercase tracking-[0.16em]"><Link href="/random" className="link">Read something unexpected</Link></p></div>)
            ) : (
              <>
                <PoemList poems={result!.items} showYear empty="No poems match these filters." />
                {pages > 1 && (<nav aria-label="Pagination" className="mt-10 flex items-center justify-between font-ui text-[0.72rem] uppercase tracking-[0.14em]"><span>{page > 1 ? <Link href={href({ page: String(page - 1) })} className="link" rel="prev">← Previous</Link> : <span className="text-ink-3">← Previous</span>}</span><span className="text-ink-3">Page {page} of {pages}</span><span>{page < pages ? <Link href={href({ page: String(page + 1) })} className="link" rel="next">Next →</Link> : <span className="text-ink-3">Next →</span>}</span></nav>)}
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) { return (<details open className="mb-5 group"><summary className="eyebrow cursor-pointer list-none [&::-webkit-details-marker]:hidden">{title}</summary><ul className="mt-2 space-y-1">{children}</ul></details>); }
function FLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) { return (<li><Link href={href} className={`block rounded px-2 py-1 -mx-2 hover:bg-paper-2 ${active ? "text-accent font-medium" : "text-ink-2"}`} aria-current={active ? "true" : undefined}>{children}</Link></li>); }
