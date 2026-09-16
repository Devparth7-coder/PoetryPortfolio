import Link from "next/link";
import type { PoemListItem } from "@/application/poems/poem-service";
import { formatDate, readingTime } from "@/lib/format";
import { languageLabel } from "@/domain/poem/language";
import { poemPath } from "@/lib/site";

export function PoemRow({ p, showYear = false }: { p: PoemListItem; showYear?: boolean }) {
  const date = p.writtenAt ?? p.publishedAt;
  return (
    <li className="group border-b rule py-5 first:border-t">
      <Link href={poemPath(p.slug)} className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-baseline">
        <div className="min-w-0">
          <h3 className="font-display text-[1.35rem] leading-snug text-ink group-hover:text-accent transition-colors" lang={p.language.split("-")[0]}>{p.title}</h3>
          {p.excerpt && <p className="mt-1 truncate font-body text-[0.98rem] italic text-ink-3" lang={p.language.split("-")[0]}>{p.excerpt}</p>}
        </div>
        <div className="flex gap-3 font-ui text-[0.7rem] uppercase tracking-[0.14em] text-ink-3 sm:flex-col sm:items-end sm:gap-0.5">
          {date && <time dateTime={date.toISOString()}>{showYear ? formatDate(date) : formatDate(date, { month: "short" })}</time>}
          <span>{readingTime(p.readingTimeSeconds)}{p.language !== "en" && ` · ${languageLabel(p.language)}`}</span>
        </div>
      </Link>
    </li>
  );
}

export function PoemList({ poems, showYear, empty = "No poems here yet." }: { poems: PoemListItem[]; showYear?: boolean; empty?: string }) {
  if (!poems.length) return <p className="py-16 text-center font-body italic text-ink-3">{empty}</p>;
  return <ul className="list-none">{poems.map((p) => <PoemRow key={p.id} p={p} showYear={showYear} />)}</ul>;
}

/** Large editorial teaser — used for featured poem on the homepage & collection pages. */
export function PoemTeaser({ p, body, label = "Featured poem" }: { p: PoemListItem; body: string; label?: string }) {
  const lines = body.split("\n"); let take: string[] = []; let count = 0;
  for (const l of lines) { take.push(l); if (l.trim()) count++; if (count >= 8) break; }
  while (take.length && !take[take.length - 1].trim()) take.pop();
  take = take.slice(0, 12);
  const truncated = take.length < lines.length;
  return (
    <article className="relative">
      <p className="eyebrow">{label}</p>
      <h2 className="mt-3 font-display text-[2rem] sm:text-[2.6rem] leading-[1.1] tracking-tight" lang={p.language.split("-")[0]}><Link href={poemPath(p.slug)} className="hover:text-accent transition-colors">{p.title}</Link></h2>
      <div className="poem-body mt-7 text-[1.15rem] text-ink-2" lang={p.language.split("-")[0]}>{take.join("\n")}{truncated ? "\n…" : ""}</div>
      <Link href={poemPath(p.slug)} className="link mt-7 inline-block font-ui text-[0.78rem] uppercase tracking-[0.16em] text-accent">Read the whole poem →</Link>
    </article>
  );
}
