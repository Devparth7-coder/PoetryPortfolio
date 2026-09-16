"use client";
import { useEffect, useState } from "react";
import { applyTheme, getTheme, type Theme } from "@/lib/prefs";
const ORDER: Theme[] = ["system", "light", "sepia", "dark"];
const LABEL: Record<Theme, string> = { system: "System", light: "Light", sepia: "Sepia", dark: "Dark" };
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => { setTheme(getTheme()); const h = (e: Event) => setTheme((e as CustomEvent).detail); window.addEventListener("dp:theme", h); return () => window.removeEventListener("dp:theme", h); }, []);
  const next = () => { const t = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]; applyTheme(t); setTheme(t); };
  return (
    <button type="button" onClick={next} aria-label={`Theme: ${LABEL[theme]}. Click to change`} title={`Theme: ${LABEL[theme]}`} className="rounded p-2 hover:bg-paper-2 text-ink-2">
      {theme === "dark" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
        : theme === "sepia" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 19h16M6 19V5h12v14M9 9h6M9 13h6" /></svg>
        : theme === "light" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>}
    </button>
  );
}
