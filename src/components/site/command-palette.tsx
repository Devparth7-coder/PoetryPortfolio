"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { applyTheme, getTheme } from "@/lib/prefs";
import { poemPath } from "@/lib/site";

type Hit = { slug: string; title: string; headline: string; collection: string | null; publishedAt: string | null };
type Cmd = { id: string; label: string; hint?: string; run: () => void; group: "Navigate" | "Actions" };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [colls, setColls] = useState<{ slug: string; title: string }[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName; const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setOpen(true); }
      else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey); window.addEventListener("dp:palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("dp:palette", onOpen); };
  }, []);
  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 10); fetch("/api/v1/session", { cache: "no-store" }).then((r) => r.json()).then((d) => setIsAdmin(!!d.user)).catch(() => {}); } else { setQ(""); setHits([]); setActive(0); } }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return; const term = q.trim(); if (term.length < 2) { setHits([]); setColls([]); return; }
    const ctrl = new AbortController(); setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(term)}&limit=8`, { signal: ctrl.signal }).then((r) => r.json()).then((d) => { setHits(d.data?.poems ?? []); setColls(d.data?.collections ?? []); setActive(0); }).catch(() => {}).finally(() => setLoading(false));
    }, 120);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, open]);

  const go = useCallback((href: string) => { setOpen(false); router.push(href); }, [router]);
  const commands = useMemo<Cmd[]>(() => {
    const c: Cmd[] = [
      { id: "random", label: "Read something unexpected", hint: "random poem", group: "Actions", run: () => go("/random") },
      { id: "poems", label: "Browse all poems", group: "Navigate", run: () => go("/poems") },
      { id: "archive", label: "Open the archive", hint: "by year", group: "Navigate", run: () => go("/archive") },
      { id: "collections", label: "Collections", group: "Navigate", run: () => go("/collections") },
      { id: "book", label: "Book mode", hint: "read as an anthology", group: "Navigate", run: () => go("/book") },
      { id: "library", label: "Your library", hint: "favourites & history", group: "Navigate", run: () => go("/library") },
      { id: "about", label: "About the poet", group: "Navigate", run: () => go("/about") },
      { id: "theme", label: "Toggle theme", hint: "light / sepia / dark", group: "Actions", run: () => { const o = ["system", "light", "sepia", "dark"] as const; const t = getTheme(); applyTheme(o[(o.indexOf(t) + 1) % o.length]); } },
    ];
    if (pathname.startsWith("/poems/")) c.unshift({ id: "reading", label: "Enter reading mode", hint: "R", group: "Actions", run: () => { setOpen(false); window.dispatchEvent(new Event("dp:reading")); } });
    if (isAdmin) c.push({ id: "admin", label: "Admin dashboard", group: "Navigate", run: () => go("/admin") });
    const term = q.trim().toLowerCase();
    return term ? c.filter((x) => x.label.toLowerCase().includes(term) || x.hint?.toLowerCase().includes(term)) : c;
  }, [q, pathname, isAdmin, go]);

  const rows = useMemo(() => [
    ...hits.map((h) => ({ key: "p:" + h.slug, kind: "poem" as const, label: h.title, sub: h.headline, meta: h.collection ?? (h.publishedAt ? new Date(h.publishedAt).getUTCFullYear().toString() : ""), run: () => go(poemPath(h.slug)) })),
    ...colls.map((c) => ({ key: "c:" + c.slug, kind: "collection" as const, label: c.title, sub: "Collection", meta: "", run: () => go(`/collections/${c.slug}`) })),
    ...commands.map((c) => ({ key: "cmd:" + c.id, kind: "command" as const, label: c.label, sub: c.hint ?? "", meta: c.group, run: c.run })),
  ], [hits, colls, commands, go]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (rows[active]) rows[active].run(); else if (q.trim()) go(`/poems?q=${encodeURIComponent(q.trim())}`); }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/30 p-4 pt-[12vh] backdrop-blur-[2px]" onClick={() => setOpen(false)} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Search and commands" className="w-full max-w-xl overflow-hidden rounded-lg border rule bg-paper shadow-2xl reveal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b rule px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="text-ink-3"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder="Search poems, collections, or type a command…" aria-label="Search" aria-activedescendant={rows[active]?.key} aria-controls="palette-list" role="combobox" aria-expanded="true" aria-autocomplete="list" className="w-full bg-transparent py-3.5 font-ui text-[0.95rem] outline-none placeholder:text-ink-3" />
          <kbd className="hidden sm:block rounded border rule px-1.5 text-[10px] text-ink-3">esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {rows.length === 0 && (<li className="px-3 py-8 text-center font-ui text-sm text-ink-3">{loading ? "Searching…" : q.trim().length >= 2 ? "Nothing found. Press Enter to search the archive." : "Start typing to search the archive."}</li>)}
          {rows.map((r, i) => (
            <li key={r.key} id={r.key} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={r.run} className={`flex cursor-pointer items-baseline justify-between gap-4 rounded px-3 py-2 ${i === active ? "bg-paper-2" : ""}`}>
              <div className="min-w-0">
                <div className={`truncate ${r.kind === "poem" ? "font-display text-[1.02rem]" : "font-ui text-sm"}`}>{r.label}</div>
                {r.sub && <div className="truncate font-ui text-xs text-ink-3 [&_mark]:bg-transparent [&_mark]:text-accent [&_mark]:font-semibold" dangerouslySetInnerHTML={{ __html: r.kind === "poem" ? r.sub : escapeHtml(r.sub) }} />}
              </div>
              <span className="shrink-0 font-ui text-[10px] uppercase tracking-wider text-ink-3">{r.meta}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t rule px-4 py-2 font-ui text-[10px] text-ink-3"><span>↑↓ navigate · ↵ open</span><span>Ctrl/⌘ K</span></div>
      </div>
    </div>
  );
}
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
