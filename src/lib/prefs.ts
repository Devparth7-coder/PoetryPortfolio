"use client";
export type Theme = "light" | "dark" | "sepia" | "system";
export type ReadingPrefs = { size: number; leading: number; width: number };
export const DEFAULT_PREFS: ReadingPrefs = { size: 1.25, leading: 1.75, width: 34 };

export function getTheme(): Theme { if (typeof window === "undefined") return "system"; return (localStorage.getItem("dp:theme") as Theme) || "system"; }
export function applyTheme(t: Theme) {
  localStorage.setItem("dp:theme", t);
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", t === "system" ? (dark ? "dark" : "light") : t);
  window.dispatchEvent(new CustomEvent("dp:theme", { detail: t }));
}
export function getReadingPrefs(): ReadingPrefs { if (typeof window === "undefined") return DEFAULT_PREFS; try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("dp:reading") || "{}") }; } catch { return DEFAULT_PREFS; } }
export function applyReadingPrefs(p: ReadingPrefs) {
  localStorage.setItem("dp:reading", JSON.stringify(p)); const s = document.documentElement.style;
  s.setProperty("--read-size", p.size + "rem"); s.setProperty("--read-leading", String(p.leading)); s.setProperty("--read-width", p.width + "rem");
}

// ----- Local reading history / favourites / bookmarks (anonymous readers; clearable) -----
type HistoryEntry = { slug: string; title: string; at: number; progress: number };
const HKEY = "dp:history", FKEY = "dp:favorites", BKEY = "dp:bookmarks";
function read<T>(k: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(k) || "") ?? fallback; } catch { return fallback; } }
export function getHistory(): HistoryEntry[] { return read<HistoryEntry[]>(HKEY, []); }
export function pushHistory(slug: string, title: string, progress = 0) {
  const h = getHistory().filter((e) => e.slug !== slug); h.unshift({ slug, title, at: Date.now(), progress }); localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 100)));
}
export function updateProgress(slug: string, progress: number) { const h = getHistory(); const e = h.find((x) => x.slug === slug); if (e) { e.progress = Math.max(e.progress, progress); localStorage.setItem(HKEY, JSON.stringify(h)); } }
export function clearHistory() { localStorage.removeItem(HKEY); window.dispatchEvent(new Event("dp:history")); }
export function getFavorites(): { slug: string; title: string }[] { return read(FKEY, []); }
export function toggleFavorite(slug: string, title: string): boolean {
  const f = getFavorites(); const i = f.findIndex((x) => x.slug === slug); if (i >= 0) f.splice(i, 1); else f.unshift({ slug, title });
  localStorage.setItem(FKEY, JSON.stringify(f)); window.dispatchEvent(new Event("dp:favorites")); return i < 0;
}
export function isFavorite(slug: string) { return getFavorites().some((x) => x.slug === slug); }
export function getBookmarks(): { slug: string; title: string }[] { return read(BKEY, []); }
export function toggleBookmark(slug: string, title: string): boolean {
  const f = getBookmarks(); const i = f.findIndex((x) => x.slug === slug); if (i >= 0) f.splice(i, 1); else f.unshift({ slug, title });
  localStorage.setItem(BKEY, JSON.stringify(f)); window.dispatchEvent(new Event("dp:bookmarks")); return i < 0;
}
export function isBookmarked(slug: string) { return getBookmarks().some((x) => x.slug === slug); }
