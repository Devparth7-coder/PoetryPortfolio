import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getArchiveTimeline, getPoemsForYear } from "@/application/poems/poem-service";
import { monthName, plural } from "@/lib/format";
import { poemPath } from "@/lib/site";

export const metadata: Metadata = { title: "The archive", description: "Explore Dev Parth's poetry year by year and month by month.", alternates: { canonical: "/archive" } };
export const revalidate = 600;

export default async function ArchivePage() {
  const { years, undated } = await getArchiveTimeline();
  const poemsByYear = await Promise.all(years.map((y) => getPoemsForYear(y.year)));
  const total = years.reduce((s, y) => s + y.total, 0);
  const max = Math.max(1, ...years.flatMap((y) => y.months.map((m) => m.count)));
  return (
    <>
      <SiteHeader />
      <main id="main" className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-8 sm:pt-14">
        <p className="eyebrow">The archive</p>
        <h1 className="mt-3 font-display text-[2.4rem] sm:text-[3.2rem] leading-[1.05] tracking-tight">{plural(total, "poem")} across {plural(years.length, "year")}.</h1>
        <p className="mt-4 max-w-xl font-body text-[1.1rem] text-ink-2">Follow the writing as it changed. Each year opens into its months; each month into the poems written then.</p>
        <ol className="mt-16 space-y-2">
          {years.map((y, yi) => (
            <li key={y.year} id={String(y.year)} className="border-t rule">
              <details open={yi === 0} className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-8 gap-y-2 py-6 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[3rem] sm:text-[4rem] leading-none tracking-tight group-hover:text-accent transition-colors">{y.year}</span>
                  <span className="font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-3">{plural(y.total, "poem")}</span>
                  <span className="ml-auto flex items-end gap-[3px] h-8" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => { const m = y.months.find((x) => x.month === i + 1); const h = m ? Math.max(3, Math.round((m.count / max) * 32)) : 2; return <span key={i} className={`w-[6px] rounded-sm ${m ? "bg-accent" : "bg-rule"}`} style={{ height: h }} />; })}</span>
                  <Link href={`/archive/${y.year}`} className="link font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-2">Open year →</Link>
                </summary>
                <div className="pb-10 pl-0 sm:pl-6">
                  {[...y.months].sort((a, b) => b.month - a.month).map((m) => {
                    const poems = poemsByYear[yi].filter((p) => ((p.writtenAt ?? p.publishedAt)!.getUTCMonth() + 1) === m.month);
                    return (<section key={m.month} className="grid gap-2 border-t rule py-5 sm:grid-cols-[10rem_1fr]"><h3 className="font-ui text-[0.72rem] uppercase tracking-[0.14em] text-ink-3 pt-1.5">{monthName(m.month)} <span className="ml-1">{m.count}</span></h3><ul>{poems.map((p) => (<li key={p.id}><Link href={poemPath(p.slug)} className="group/i flex items-baseline justify-between gap-4 py-1"><span className="font-display text-[1.2rem] leading-snug group-hover/i:text-accent transition-colors" lang={p.language.split("-")[0]}>{p.title}</span><span className="font-ui text-[0.68rem] tabular-nums text-ink-3 shrink-0">{(p.writtenAt ?? p.publishedAt)!.getUTCDate()}</span></Link></li>))}</ul></section>);
                  })}
                </div>
              </details>
            </li>
          ))}
        </ol>
        {undated > 0 && <p className="mt-10 font-ui text-[0.78rem] text-ink-3">{plural(undated, "poem")} without a known date {undated === 1 ? "is" : "are"} listed under <Link href="/poems?sort=title" className="link">all poems</Link>.</p>}
      </main>
      <SiteFooter />
    </>
  );
}
