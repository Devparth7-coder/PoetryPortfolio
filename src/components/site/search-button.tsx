"use client";
export function SearchButton() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("dp:palette"))} className="flex items-center gap-2 rounded px-2.5 py-1.5 text-ink-2 hover:bg-paper-2" aria-label="Search (press /)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline rounded border rule px-1.5 text-[10px] text-ink-3">/</kbd>
    </button>
  );
}
