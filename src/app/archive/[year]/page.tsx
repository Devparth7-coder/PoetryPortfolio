import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getArchiveTimeline, getPoemsForYear } from "@/application/poems/poem-service";
import { PoemList } from "@/components/poem/poem-list";
import { monthName, plural } from "@/lib/format";

export const revalidate = 600;
export async function generateStaticParams() { const { years } = await getArchiveTimeline(); return years.map((y) => ({ year: String(y.year) })); }
export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> { const { year } = await params; return { title: `Poems from ${year}`, description: `All poems Dev Parth wrote in ${year}.`, alternates: { canonical: `/archive/${year}` } }; }

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: ys } = await params; const year = Number(ys);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) notFound();
  const poems = await getPoemsForYear(year); if (!poems.length) notFound();
  const { years } = await getArchiveTimeline(); const idx = years.findIndex((y) => y.year === year); const prev = years[idx + 1]; const next = years[idx - 1];
  const months = [...new Set(poems.map((p) => (p.writtenAt ?? p.publishedAt)!.getUTCMonth() + 1))].sort((a, b) => b - a);
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-14">
        <p className="eyebrow"><Link href="/archive" className="link">The archive</Link></p>
        <h1 className="mt-3 font-display text-[3.4rem] sm:text-[5rem] leading-none tracking-tight">{year}</h1>
        <p className="mt-3 font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">{plural(poems.length, "poem")} · {plural(months.length, "month")}</p>
        {months.map((m) => (<section key={m} className="mt-12"><h2 className="eyebrow mb-2">{monthName(m)}</h2><PoemList poems={poems.filter((p) => (p.writtenAt ?? p.publishedAt)!.getUTCMonth() + 1 === m)} /></section>))}
        <nav aria-label="Other years" className="mt-16 flex justify-between font-ui text-[0.72rem] uppercase tracking-[0.14em]"><span>{prev && <Link href={`/archive/${prev.year}`} className="link">← {prev.year}</Link>}</span><span>{next && <Link href={`/archive/${next.year}`} className="link">{next.year} →</Link>}</span></nav>
      </main>
      <SiteFooter />
    </>
  );
}
