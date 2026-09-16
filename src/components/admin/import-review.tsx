"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, btn2Cls, btnCls, inputCls } from "./ui";
import { formatDate } from "@/lib/format";
type Item = { id: string; position: number; status: string; title: string; body: string; language: string | null; detectedDate: string | null; sourceUrl: string | null; sourceCategories: string[]; trending: boolean; confidence: number; flags: string[]; matchedWorkId: string | null; matchKind: string | null; similarity: number | null; resolution: string | null; resultWorkId: string | null; metadata: Record<string, unknown> };
type Job = { id: string; status: string; totals: Record<string, number>; report: Record<string, unknown>; items: Item[] };
type Match = { item: Item; matched: { id: string; title: string; body: string; slug: string; sources: { source: string; sourceUrl: string | null }[] } | null; diff: { type: string; text: string }[] | null };
const TONE: Record<string, "good" | "warn" | "bad" | "info" | "neutral"> = { NEW: "good", DUPLICATE_EXACT: "neutral", DUPLICATE_LIKELY: "warn", CONFLICT: "bad", LOW_CONFIDENCE: "bad", APPROVED: "info", REJECTED: "neutral", IMPORTED: "good", MERGED: "good" };
const OPEN = ["NEW", "DUPLICATE_EXACT", "DUPLICATE_LIKELY", "CONFLICT", "LOW_CONFIDENCE", "APPROVED"];

export function ImportReview({ job }: { job: Job }) {
  const router = useRouter(); const [filter, setFilter] = useState<string>("ALL"); const [openId, setOpenId] = useState<string | null>(null); const [match, setMatch] = useState<Match | null>(null); const [busy, setBusy] = useState(false); const [publish, setPublish] = useState(true); const [report, setReport] = useState<Record<string, unknown> | null>((job.report.execution as Record<string, unknown>) ?? null);
  const counts = useMemo(() => job.items.reduce<Record<string, number>>((a, i) => ((a[i.status] = (a[i.status] ?? 0) + 1), a), {}), [job.items]);
  const items = job.items.filter((i) => filter === "ALL" || i.status === filter);
  const approvedCount = job.items.filter((i) => i.status === "APPROVED").length;
  const open = async (it: Item) => { setOpenId(openId === it.id ? null : it.id); if (openId !== it.id) { const r = await fetch(`/api/v1/admin/import/${job.id}/items?itemId=${it.id}`).then((x) => x.json()); setMatch(r.data); } };
  const resolve = async (itemId: string, resolution: string | null, overrides?: Record<string, unknown>) => { setBusy(true); await fetch(`/api/v1/admin/import/${job.id}/items`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId, resolution, overrides }) }); setBusy(false); router.refresh(); };
  const auto = async () => { setBusy(true); await fetch(`/api/v1/admin/import/${job.id}/auto`, { method: "POST" }); setBusy(false); router.refresh(); };
  const execute = async () => { if (!confirm(`Import ${approvedCount} approved item(s)${publish ? " and publish them" : " as drafts"}?`)) return; setBusy(true); const r = await fetch(`/api/v1/admin/import/${job.id}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ publish }) }).then((x) => x.json()); setBusy(false); setReport(r.data ?? r.error); router.refresh(); };
  const reject = async () => { if (!confirm("Reject this whole import? Nothing will be written.")) return; await fetch(`/api/v1/admin/import/${job.id}/reject`, { method: "POST" }); router.refresh(); };
  const notes = job.report.notes as Record<string, unknown> | undefined;

  return (<div className="font-ui text-sm">
    <div className="mb-4 flex flex-wrap gap-2">{["ALL", ...Object.keys(counts)].map((s) => <button key={s} type="button" onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs ${filter === s ? "border-accent text-accent" : "rule text-ink-2"}`}>{s} {s === "ALL" ? job.items.length : counts[s]}</button>)}</div>
    {notes && (notes.failures as unknown[] | undefined)?.length ? <details className="mb-4 rounded border border-amber-700/40 p-3"><summary className="cursor-pointer text-amber-800">{(notes.failures as unknown[]).length} source page(s) could not be fetched or parsed — upload saved HTML for these</summary><pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(notes.failures, null, 1)}</pre></details> : null}
    {notes?.hint ? <p className="mb-4 rounded border rule p-3 text-ink-2">{String(notes.hint)}</p> : null}
    {job.status !== "COMPLETED" && job.status !== "REJECTED" && (<div className="mb-6 flex flex-wrap items-center gap-3 rounded border rule bg-paper-2/60 p-3">
      <button type="button" onClick={auto} disabled={busy} className={btn2Cls}>Auto-approve safe items</button><span className="text-xs text-ink-3">NEW → create · exact duplicates → add as source. Conflicts &amp; low-confidence stay for you.</span>
      <label className="ml-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />Publish on import</label>
      <button type="button" onClick={execute} disabled={busy || approvedCount === 0} className={btnCls}>Import {approvedCount} approved</button><button type="button" onClick={reject} className="link text-xs text-red-700">Reject job</button></div>)}
    {report && <details open className="mb-6 rounded border rule p-3"><summary className="cursor-pointer eyebrow">Import report</summary><pre className="mt-2 max-h-64 overflow-auto text-xs">{JSON.stringify(report, null, 1)}</pre></details>}
    <ul className="divide-y divide-[var(--rule)] rounded border rule">
      {items.map((it) => (<li key={it.id}>
        <button type="button" onClick={() => open(it)} className="flex w-full flex-wrap items-center gap-3 px-3 py-2 text-left hover:bg-paper-2" aria-expanded={openId === it.id}>
          <span className="w-8 text-ink-3 tabular-nums">{it.position + 1}</span><span className="font-display text-[1.02rem]">{it.title}</span><Badge tone={TONE[it.status] ?? "neutral"}>{it.status}</Badge>{it.resolution && <Badge tone="info">{it.resolution}</Badge>}{it.trending && <span title="Trended at source">🔥</span>}
          <span className="ml-auto flex gap-3 text-xs text-ink-3">{it.language && <span>{it.language}</span>}{it.detectedDate ? <span>{formatDate(it.detectedDate, { month: "short" })}</span> : <span className="text-amber-700">no date</span>}<span>conf {Math.round(it.confidence * 100)}%</span>{it.similarity != null && <span>sim {Math.round(it.similarity * 100)}%</span>}</span>
        </button>
        {openId === it.id && (<div className="grid gap-6 border-t rule bg-paper-2/40 p-4 lg:grid-cols-2">
          <div><div className="mb-2 flex flex-wrap gap-1">{it.flags.map((f) => <Badge key={f} tone={f.includes("garbled") || f.includes("review") ? "bad" : "neutral"}>{f}</Badge>)}{it.sourceCategories.map((c) => <Badge key={c} tone="info">{c}</Badge>)}</div>
            {it.sourceUrl && <a href={it.sourceUrl} target="_blank" rel="noopener" className="link text-xs">{it.sourceUrl}</a>}
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded border rule bg-paper p-3 font-body text-[0.98rem] leading-relaxed">{it.body}</pre>
            {it.status === "LOW_CONFIDENCE" && <p className="mt-2 text-xs text-red-700">Extraction confidence is too low (likely non-Latin text lost in the PDF). Import from the original web page instead, or paste the correct text manually.</p>}
          </div>
          <div>
            {match?.item.id === it.id && match.matched ? (<><p className="eyebrow">Matches existing poem</p><p className="mt-1 font-display text-[1.05rem]"><a href={`/admin/poems/${match.matched.id}`} className="link">{match.matched.title}</a> <span className="text-xs text-ink-3">({it.matchKind})</span></p><p className="text-xs text-ink-3">Sources: {match.matched.sources.map((s) => s.source).join(", ")}</p>
              {match.diff && match.diff.some((d) => d.type !== "same") ? (<><p className="mt-3 text-xs text-ink-3">Existing (<span className="text-red-700">removed</span>) → incoming (<span className="text-green-700">added</span>)</p><pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded border rule bg-paper p-3 font-body text-[0.95rem]">{match.diff.map((l, i) => <div key={i} className={l.type === "add" ? "bg-green-700/10" : l.type === "del" ? "bg-red-700/10 line-through" : ""}>{l.text || " "}</div>)}</pre></>) : <p className="mt-3 text-xs text-green-800">Text is identical.</p>}
              <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => resolve(it.id, "merge-source")} className={btn2Cls}>Same poem — add as source</button><button type="button" disabled={busy} onClick={() => resolve(it.id, "keep-variant")} className={btn2Cls}>Keep as private variant</button><button type="button" disabled={busy} onClick={() => { if (confirm("Replace the canonical text with this version? The current text is preserved as a version.")) resolve(it.id, "replace-canonical"); }} className={btn2Cls}>Make this canonical</button><button type="button" disabled={busy} onClick={() => resolve(it.id, "create")} className={btn2Cls}>Different poem — create new</button><button type="button" disabled={busy} onClick={() => resolve(it.id, "skip")} className="link text-xs">Skip</button></div></>)
              : (<><p className="eyebrow">No existing match</p><ItemOverrides it={it} busy={busy} onResolve={resolve} /></>)}
            {it.resolution && <button type="button" onClick={() => resolve(it.id, null)} className="link mt-3 block text-xs text-ink-3">Clear decision</button>}
          </div>
        </div>)}
      </li>))}
      {items.length === 0 && <li className="px-3 py-6 text-ink-3">Nothing in this view.</li>}
    </ul>
    {job.items.filter((i) => OPEN.includes(i.status)).length === 0 && job.status === "COMPLETED" && <p className="mt-4 text-ink-3">All items processed.</p>}
  </div>);
}
function ItemOverrides({ it, busy, onResolve }: { it: Item; busy: boolean; onResolve: (id: string, r: string | null, o?: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState(it.title); const [lang, setLang] = useState(it.language ?? "en"); const [date, setDate] = useState(it.detectedDate ? it.detectedDate.slice(0, 10) : "");
  return (<div className="mt-2 space-y-2"><label className="block"><span className="text-xs text-ink-3">Title (fix extraction only — never rewrite)</span><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></label><div className="flex gap-2"><label className="block flex-1"><span className="text-xs text-ink-3">Language</span><select value={lang} onChange={(e) => setLang(e.target.value)} className={inputCls}>{["en", "hi", "hi-Latn", "ur", "und"].map((l) => <option key={l}>{l}</option>)}</select></label><label className="block flex-1"><span className="text-xs text-ink-3">Date (blank = unknown)</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></label></div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => onResolve(it.id, "create", { title, language: lang, date: date || null })} className={btnCls}>Approve as new poem</button><button type="button" disabled={busy} onClick={() => onResolve(it.id, "skip")} className={btn2Cls}>Reject</button></div></div>);
}
