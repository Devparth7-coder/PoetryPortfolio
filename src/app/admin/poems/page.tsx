import Link from "next/link";
import { listPoems } from "@/application/poems/poem-service";
import { PageTitle, Badge, Table, statusTone } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
const PAGE = 50;
export default async function AdminPoems({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; sort?: string }> }) {
  const sp = await searchParams; const status = (["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].includes(sp.status ?? "") ? sp.status : "ALL") as "ALL"; const page = Math.max(1, Number(sp.page) || 1);
  const r = await listPoems({ includeDrafts: true, status, limit: PAGE, offset: (page - 1) * PAGE, sort: (sp.sort as "title") ?? "newest" });
  return (<>
    <PageTitle eyebrow="Content" title={`Poems (${r.total})`} action={<Link href="/admin/poems/new" className="rounded bg-ink px-4 py-2 font-ui text-sm text-paper">New poem</Link>} />
    <div className="mb-4 flex flex-wrap gap-2 font-ui text-xs">{["ALL", "PUBLISHED", "REVIEW", "DRAFT", "ARCHIVED"].map((s) => <Link key={s} href={`/admin/poems${s === "ALL" ? "" : `?status=${s}`}`} className={`rounded-full border px-3 py-1 ${status === s ? "border-accent text-accent" : "rule text-ink-2"}`}>{s}</Link>)}<Link href={`/admin/poems?sort=title${status !== "ALL" ? `&status=${status}` : ""}`} className="ml-auto link text-ink-3">Sort A–Z</Link></div>
    <Table head={["Title", "Status", "Language", "Date", "Lines", "Featured", ""]}>
      {r.items.map((p) => <tr key={p.id}><td><Link href={`/admin/poems/${p.id}`} className="font-display text-[1.02rem] hover:text-accent">{p.title}</Link></td><td><Badge tone={statusTone(p.status)}>{p.status}</Badge></td><td className="text-ink-3">{p.language}</td><td className="text-ink-3">{formatDate(p.writtenAt ?? p.publishedAt, { month: "short" }) ?? "—"}</td><td className="tabular-nums text-ink-3">{p.lineCount}</td><td>{p.featured ? "★" : p.trendingAtSource ? "🔥" : ""}</td><td>{p.status === "PUBLISHED" && <a href={`/poems/${encodeURIComponent(p.slug)}`} target="_blank" className="link text-ink-3">view</a>}</td></tr>)}
    </Table>
    {r.total > PAGE && <nav className="mt-4 flex justify-between font-ui text-xs">{page > 1 ? <Link className="link" href={`/admin/poems?status=${status}&page=${page - 1}`}>← Previous</Link> : <span />}<span className="text-ink-3">Page {page} / {Math.ceil(r.total / PAGE)}</span>{page * PAGE < r.total ? <Link className="link" href={`/admin/poems?status=${status}&page=${page + 1}`}>Next →</Link> : <span />}</nav>}
  </>);
}
