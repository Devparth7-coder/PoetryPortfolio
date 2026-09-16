const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function formatDate(d: Date | string | null | undefined, opts: { month?: "long" | "short"; day?: boolean } = {}) {
  if (!d) return null; const date = typeof d === "string" ? new Date(d) : d; if (isNaN(date.getTime())) return null;
  const m = MONTHS[date.getUTCMonth()]; const mm = opts.month === "short" ? m.slice(0, 3) : m;
  return opts.day === false ? `${mm} ${date.getUTCFullYear()}` : `${date.getUTCDate()} ${mm} ${date.getUTCFullYear()}`;
}
export function monthName(m: number, short = false) { const n = MONTHS[m - 1] ?? ""; return short ? n.slice(0, 3) : n; }
export function readingTime(seconds: number) { const m = Math.max(1, Math.round(seconds / 60)); return `${m} min read`; }
export function isoDate(d: Date | string | null | undefined) { if (!d) return undefined; const x = typeof d === "string" ? new Date(d) : d; return isNaN(x.getTime()) ? undefined : x.toISOString(); }
export function plural(n: number, s: string, p = s + "s") { return `${n} ${n === 1 ? s : p}`; }
