"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { applyReadingPrefs, DEFAULT_PREFS, getReadingPrefs, isBookmarked, isFavorite, pushHistory, toggleBookmark, toggleFavorite, updateProgress, type ReadingPrefs } from "@/lib/prefs";
import { poemPath } from "@/lib/site";

type Adj = { slug: string; title: string } | null;
interface Props { slug: string; title: string; id: string; prev: Adj; next: Adj; url: string; children: React.ReactNode }

/**
 * Client shell around the server-rendered poem: reading controls, cinematic mode, sharing, history & analytics ping.
 * The poem text itself is rendered on the server (SEO) and only moved into the overlay in reading mode.
 */
export function PoemReader({ slug, title, id, prev, next, url, children }: Props) {
  const router = useRouter();
  const [reading, setReading] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const [fav, setFav] = useState(false);
  const [mark, setMark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const completed = useRef(false);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => { setPrefs(getReadingPrefs()); setFav(isFavorite(slug)); setMark(isBookmarked(slug)); pushHistory(slug, title); }, [slug, title]);
  useEffect(() => { const c = new AbortController(); fetch("/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "view", id }), keepalive: true, signal: c.signal }).catch(() => {}); return () => c.abort(); }, [id]);

  // reading progress + completion
  useEffect(() => {
    const onScroll = () => {
      const el = document.querySelector<HTMLElement>("[data-poem-body]"); if (!el) return;
      const rect = el.getBoundingClientRect(); const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh * 0.3)));
      setProgress(p); updateProgress(slug, p);
      if (p > 0.92 && !completed.current) { completed.current = true; fetch("/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "complete", id }), keepalive: true }).catch(() => {}); }
    };
    const root = reading ? document.querySelector(".reading-overlay") : window;
    root?.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    return () => root?.removeEventListener("scroll", onScroll);
  }, [slug, id, reading]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 1800); };
  const share = useCallback(async (channel: "copy" | "x" | "whatsapp" | "linkedin" | "native") => {
    const text = `“${title}” — a poem by Dev Parth`;
    fetch("/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "share", id, channel }), keepalive: true }).catch(() => {});
    if (channel === "copy") { await navigator.clipboard.writeText(url); notify("Link copied"); return; }
    if (channel === "native") { if (navigator.share) { try { await navigator.share({ title, text, url }); } catch { /* cancelled */ } } else { await navigator.clipboard.writeText(url); notify("Link copied"); } return; }
    const links = { x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` };
    window.open(links[channel], "_blank", "noopener,noreferrer,width=600,height=500");
  }, [title, url, id]);

  const onFav = () => { const on = toggleFavorite(slug, title); setFav(on); notify(on ? "Added to favourites" : "Removed from favourites"); fetch("/api/v1/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "favorite", id, delta: on ? 1 : -1 }), keepalive: true }).catch(() => {}); };
  const onMark = () => { const on = toggleBookmark(slug, title); setMark(on); notify(on ? "Bookmarked" : "Bookmark removed"); };

  // keyboard: R reading mode, Esc exit, ←/→ prev/next, F favourite, P print
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setReading((r) => !r); }
      else if (e.key === "Escape") { setReading(false); setPrefsOpen(false); }
      else if (e.key === "ArrowLeft" && prev) router.push(poemPath(prev.slug));
      else if (e.key === "ArrowRight" && next) router.push(poemPath(next.slug));
      else if (e.key === "f" || e.key === "F") onFav();
    };
    const onReading = () => setReading(true);
    window.addEventListener("keydown", onKey); window.addEventListener("dp:reading", onReading);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("dp:reading", onReading); };
  });
  useEffect(() => { document.body.dataset.reading = reading ? "true" : "false"; return () => { delete document.body.dataset.reading; }; }, [reading]);

  const setPref = (patch: Partial<ReadingPrefs>) => { const n = { ...prefs, ...patch }; setPrefs(n); applyReadingPrefs(n); };

  // swipe between poems (mobile)
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current; if (!s) return; const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
    if (Date.now() - s.t < 600 && Math.abs(dx) > 90 && Math.abs(dy) < 50) { if (dx < 0 && next) router.push(poemPath(next.slug)); if (dx > 0 && prev) router.push(poemPath(prev.slug)); }
    touch.current = null;
  };

  const controls = (
    <div className={`no-print flex items-center gap-1 font-ui text-[0.72rem] text-ink-2 ${reading ? "" : ""}`} role="toolbar" aria-label="Reading tools">
      <IconBtn label={reading ? "Exit reading mode (Esc)" : "Reading mode (R)"} onClick={() => setReading((r) => !r)} active={reading}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{reading ? <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</svg></IconBtn>
      <IconBtn label="Text settings" onClick={() => setPrefsOpen((o) => !o)} active={prefsOpen} aria-expanded={prefsOpen}><span className="font-display text-[15px] leading-none" aria-hidden="true">Aa</span></IconBtn>
      <IconBtn label={fav ? "Remove from favourites (F)" : "Add to favourites (F)"} onClick={onFav} active={fav} pressed={fav}><svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.2 5.3 5.3 0 0 1 21.3 12C19 16.4 12 21 12 21z" /></svg></IconBtn>
      <IconBtn label={mark ? "Remove bookmark" : "Bookmark"} onClick={onMark} active={mark} pressed={mark}><svg width="16" height="16" viewBox="0 0 24 24" fill={mark ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg></IconBtn>
      <IconBtn label="Copy link" onClick={() => share("copy")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg></IconBtn>
      <details className="relative">
        <summary aria-label="Share" title="Share" className="list-none cursor-pointer rounded p-2 hover:bg-paper-2 [&::-webkit-details-marker]:hidden"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 13v7h14v-7" /></svg></summary>
        <ul className="absolute right-0 z-20 mt-1 w-44 rounded-md border rule bg-paper p-1 shadow-lg">
          {[["native", "Share…"], ["x", "Share to X"], ["whatsapp", "Share to WhatsApp"], ["linkedin", "Share to LinkedIn"], ["copy", "Copy link"]].map(([c, l]) => (<li key={c}><button type="button" onClick={() => share(c as never)} className="block w-full rounded px-3 py-2 text-left hover:bg-paper-2">{l}</button></li>))}
        </ul>
      </details>
      <IconBtn label="Print" onClick={() => window.print()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z" /></svg></IconBtn>
      <a href={`/poems/${encodeURIComponent(slug)}/pdf`} className="rounded p-2 hover:bg-paper-2" aria-label="Download PDF" title="Download PDF"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg></a>
    </div>
  );

  const prefsPanel = prefsOpen && (
    <div className="no-print mx-auto mt-3 rounded-md border rule bg-paper p-4 font-ui text-[0.78rem] shadow-lg" style={{ maxWidth: "calc(var(--read-width) + 6rem)" }} role="group" aria-label="Text settings">
      <Slider label="Text size" value={prefs.size} min={1} max={1.9} step={0.05} onChange={(v) => setPref({ size: v })} format={(v) => `${Math.round(v * 16)}px`} />
      <Slider label="Line height" value={prefs.leading} min={1.4} max={2.4} step={0.05} onChange={(v) => setPref({ leading: v })} format={(v) => v.toFixed(2)} />
      <Slider label="Width" value={prefs.width} min={22} max={52} step={1} onChange={(v) => setPref({ width: v })} format={(v) => `${v}rem`} />
      <div className="mt-2 flex justify-between"><span className="text-ink-3">Saved on this device.</span><button type="button" className="link" onClick={() => setPref(DEFAULT_PREFS)}>Reset</button></div>
    </div>
  );

  const body = (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="no-print sticky top-0 z-30 bg-paper/85 backdrop-blur-sm border-b rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-8 py-1.5">
          <div className="flex items-center gap-2 text-ink-3 font-ui text-[0.7rem]">
            {prev && <a href={poemPath(prev.slug)} className="rounded p-2 hover:bg-paper-2" aria-label={`Previous poem: ${prev.title}`} title={prev.title}>←</a>}
            {next && <a href={poemPath(next.slug)} className="rounded p-2 hover:bg-paper-2" aria-label={`Next poem: ${next.title}`} title={next.title}>→</a>}
            <span className="hidden sm:inline ml-2 truncate max-w-[16rem]">{reading ? title : ""}</span>
          </div>
          {controls}
        </div>
        <div className="h-px bg-accent transition-[width] duration-200 ease-out" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      </div>
      <div className="px-5 sm:px-8">{prefsPanel}</div>
      {children}
      {toast && <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 font-ui text-xs text-paper shadow-lg reveal">{toast}</div>}
    </div>
  );

  if (reading) return (<div className="reading-overlay" role="region" aria-label="Reading mode"><div className="relative z-10 pb-32">{body}</div></div>);
  return body;
}

function IconBtn({ label, onClick, active, pressed, children, ...rest }: { label: string; onClick: () => void; active?: boolean; pressed?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={pressed} className={`rounded p-2 hover:bg-paper-2 ${active ? "text-accent" : ""}`} {...rest}>{children}</button>;
}
function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const id = label.toLowerCase().replace(/\s/g, "-");
  return (<label htmlFor={id} className="mb-3 grid grid-cols-[6rem_1fr_3.5rem] items-center gap-3"><span>{label}</span><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[var(--accent)]" /><span className="text-right tabular-nums text-ink-3">{format(value)}</span></label>);
}
