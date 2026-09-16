"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getHistory } from "@/lib/prefs";
import { poemPath } from "@/lib/site";
export function ContinueReading() {
  const [entry, setEntry] = useState<{ slug: string; title: string; progress: number } | null>(null);
  useEffect(() => { const h = getHistory(); const e = h.find((x) => x.progress < 0.95) ?? h[0]; if (e) setEntry(e); }, []);
  if (!entry) return null;
  return (
    <section aria-label="Continue reading" className="border-t rule">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-ui text-[0.8rem] text-ink-3">
        <span className="uppercase tracking-[0.16em] text-[0.68rem]">{entry.progress < 0.95 ? "Continue reading" : "Recently read"}</span>
        <Link href={poemPath(entry.slug)} className="link font-display text-[1.15rem] text-ink">{entry.title}</Link>
        <Link href="/library" className="link ml-auto">Your library →</Link>
      </div>
    </section>
  );
}
