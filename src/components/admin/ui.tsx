import Link from "next/link";
export function PageTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (<div className="mb-8 flex flex-wrap items-end justify-between gap-4">{<div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="mt-1 font-display text-[2rem] tracking-tight">{title}</h1></div>}{action}</div>);
}
export function Stat({ label, value, sub, href }: { label: string; value: React.ReactNode; sub?: string; href?: string }) {
  const inner = (<><dt className="eyebrow">{label}</dt><dd className="mt-1 font-display text-[1.9rem] leading-none tabular-nums">{value}</dd>{sub && <dd className="mt-1 font-ui text-xs text-ink-3">{sub}</dd>}</>);
  return href ? <Link href={href} className="block rounded border rule p-4 hover:bg-paper-2">{inner}</Link> : <div className="rounded border rule p-4">{inner}</div>;
}
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const c = { neutral: "border-rule text-ink-3", good: "border-green-700/40 text-green-800 dark:text-green-400", warn: "border-amber-700/40 text-amber-800 dark:text-amber-400", bad: "border-red-700/40 text-red-800 dark:text-red-400", info: "border-accent/40 text-accent" }[tone];
  return <span className={`inline-block rounded-full border px-2 py-0.5 font-ui text-[0.65rem] uppercase tracking-wider ${c}`}>{children}</span>;
}
export const statusTone = (s: string) => (s === "PUBLISHED" ? "good" : s === "REVIEW" ? "info" : s === "ARCHIVED" ? "neutral" : "warn") as "good";
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (<div className="overflow-x-auto rounded border rule"><table className="w-full font-ui text-[0.82rem]"><thead className="bg-paper-2 text-left"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium text-ink-3">{h}</th>)}</tr></thead><tbody className="[&_td]:px-3 [&_td]:py-2 [&_tr]:border-t [&_tr]:border-[var(--rule)]">{children}</tbody></table></div>);
}
export const inputCls = "w-full rounded border rule bg-paper px-3 py-2 font-ui text-sm outline-none focus:border-accent";
export const btnCls = "rounded bg-ink px-4 py-2 font-ui text-sm text-paper hover:opacity-90 disabled:opacity-50";
export const btn2Cls = "rounded border rule px-4 py-2 font-ui text-sm hover:bg-paper-2 disabled:opacity-50";
