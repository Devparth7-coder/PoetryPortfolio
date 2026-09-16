import Link from "next/link";
import { getDashboardStats, getDataQuality } from "@/application/analytics/analytics-service";
import { listJobs } from "@/application/import/import-service";
import { db } from "@/infrastructure/db/client"; import { auditLogs } from "@/infrastructure/db/schema"; import { desc } from "drizzle-orm";
import { PageTitle, Stat, Badge } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
export default async function AdminHome() {
  const [s, q, jobs, audit] = await Promise.all([getDashboardStats(), getDataQuality(), listJobs(5), db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8)]);
  return (<>
    <PageTitle eyebrow="Dashboard" title="The archive at a glance" action={<Link href="/admin/poems/new" className="rounded bg-ink px-4 py-2 font-ui text-sm text-paper">New poem</Link>} />
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Poems" value={s.totals.total} sub={`${s.totals.published} published`} href="/admin/poems" /><Stat label="Drafts / review" value={`${s.totals.drafts} / ${s.totals.review}`} href="/admin/poems?status=DRAFT" /><Stat label="Words written" value={s.totals.words.toLocaleString()} sub={`${s.totals.chars.toLocaleString()} characters`} /><Stat label="Needs review" value={q.pendingReview} sub={`${q.openConflicts} conflicts · ${q.lowConfidence} low confidence`} href="/admin/data-quality" />
    </dl>
    <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <section><h2 className="eyebrow mb-3">Recent imports</h2><ul className="divide-y divide-[var(--rule)] rounded border rule font-ui text-sm">{jobs.map((j) => <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-2"><Link href={`/admin/import/${j.id}`} className="link truncate">{j.inputLabel}</Link><span className="flex items-center gap-2 shrink-0"><span className="text-ink-3 tabular-nums">{(j.totals as { extracted?: number }).extracted ?? 0}</span><Badge tone={j.status === "COMPLETED" ? "good" : j.status === "FAILED" ? "bad" : "info"}>{j.status}</Badge></span></li>)}{jobs.length === 0 && <li className="px-3 py-4 text-ink-3">No imports yet.</li>}</ul></section>
      <section><h2 className="eyebrow mb-3">Recent activity</h2><ul className="divide-y divide-[var(--rule)] rounded border rule font-ui text-sm">{audit.map((a) => <li key={a.id} className="px-3 py-2"><span className="text-ink-3">{formatDate(a.createdAt, { month: "short" })}</span> · <span className="font-medium">{a.action}</span>{a.summary && <span className="text-ink-2"> — {a.summary}</span>}</li>)}</ul><Link href="/admin/audit" className="link mt-2 inline-block font-ui text-xs text-ink-3">Full audit log →</Link></section>
    </div>
  </>);
}
