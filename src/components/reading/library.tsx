"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearHistory, getBookmarks, getFavorites, getHistory } from "@/lib/prefs";
import { poemPath } from "@/lib/site";
function Sec({ title, items, empty, extra }: { title: string; items: { slug: string; title: string; sub?: string }[]; empty: string; extra?: React.ReactNode }) {
  return (
    <section className="mt-12"><div className="flex items-baseline justify-between border-b rule pb-2"><h2 className="eyebrow">{title}</h2>{extra}</div>{items.length === 0 ? <p className="py-6 font-body italic text-ink-3">{empty}</p> : <ul>{items.map((i) => (<li key={i.slug} className="border-b rule py-3 flex items-baseline justify-between gap-4"><Link href={poemPath(i.slug)} className="font-display text-[1.2rem] hover:text-accent transition-colors">{i.title}</Link>{i.sub && <span className="font-ui text-[0.68rem] uppercase tracking-[0.14em] text-ink-3">{i.sub}</span>}</li>))}</ul>}</section>);
}
export function Library() {
  const [fav, setFav] = useState<{ slug: string; title: string }[]>([]); const [marks, setMarks] = useState<{ slug: string; title: string }[]>([]); const [hist, setHist] = useState<ReturnType<typeof getHistory>>([]);
  const load = () => { setFav(getFavorites()); setMarks(getBookmarks()); setHist(getHistory()); };
  useEffect(() => { load(); for (const e of ["dp:favorites", "dp:bookmarks", "dp:history"]) window.addEventListener(e, load); return () => { for (const e of ["dp:favorites", "dp:bookmarks", "dp:history"]) window.removeEventListener(e, load); }; }, []);
  const random = `/random?exclude=${hist.slice(0, 50).map((h) => h.slug).join(",")}`;
  return (<div className="grid gap-x-16 lg:grid-cols-2">
    <div><Sec title="Favourites" items={fav} empty="Press F on any poem to keep it here." /><Sec title="Bookmarks" items={marks} empty="No bookmarks yet." /></div>
    <div><Sec title="Reading history" items={hist.map((h) => ({ slug: h.slug, title: h.title, sub: h.progress >= 0.95 ? "Finished" : h.progress > 0.05 ? `${Math.round(h.progress * 100)}%` : "Opened" }))} empty="Poems you open will appear here." extra={hist.length > 0 && <button type="button" onClick={() => { if (confirm("Clear reading history on this device?")) clearHistory(); }} className="link font-ui text-[0.72rem] text-ink-3">Clear history</button>} />
      <p className="mt-6 font-ui text-[0.78rem] uppercase tracking-[0.16em]"><a href={random} className="link">Read something you haven&apos;t →</a></p></div>
  </div>);
}
