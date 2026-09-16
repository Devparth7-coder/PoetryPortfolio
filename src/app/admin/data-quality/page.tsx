import Link from "next/link";
import { getDataQuality } from "@/application/analytics/analytics-service";
import { PageTitle, Stat, Table, Badge } from "@/components/admin/ui";
import { SOURCE_LABELS, type SourceKind } from "@/domain/poem/types";
export default async function DataQuality() {
  const q = await getDataQuality();
  const sourceCount = (s: string) => q.sourceTotals.find((x) => x.source === s)?.extracted ?? 0; const importedFrom = (s: string) => q.bySource.find((x) => x.source === s)?.poems ?? 0;
  return (<>
    <PageTitle eyebrow="Integrity" title="Data quality" />
    <p className="mb-6 max-w-2xl font-ui text-sm text-ink-2">All numbers below are computed live from the database. Nothing here is estimated.</p>
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Poems in archive" value={q.imported} sub={`${q.published} published`} /><Stat label="Pending review" value={q.pendingReview} sub={`${q.openConflicts} conflicts · ${q.lowConfidence} low confidence · ${q.openDuplicates} duplicates`} href="/admin/import" /><Stat label="Multi-source poems" value={q.multiSource} sub="same poem on ≥2 platforms" /><Stat label="Conflicting versions" value={q.conflictingVersions} sub="private variants kept" />
      <Stat label="Missing date" value={q.missingDates} /><Stat label="Missing source" value={q.missingSource} /><Stat label="Unknown language" value={q.missingLanguage} /><Stat label="Uncategorised" value={q.uncategorised} sub="no tag or collection yet" /><Stat label="Missing excerpt" value={q.missingExcerpt} /><Stat label="Public duplicate groups" value={q.publicDuplicateGroups} sub="identical normalised text" />
    </dl>
    <h2 className="eyebrow mt-10 mb-3">Source reconciliation</h2>
    <Table head={["Source", "Extracted by importer", "Poems with this provenance", "Canonical text from here"]}>{["MY_POETIC_SIDE", "POETRY_COM", "ANTHOLOGY", "MANUAL", "PDF", "HTML", "TXT", "MARKDOWN", "CSV", "JSON"].filter((s) => sourceCount(s) || importedFrom(s)).map((s) => <tr key={s}><td>{SOURCE_LABELS[s as SourceKind]}</td><td className="tabular-nums">{sourceCount(s)}</td><td className="tabular-nums">{importedFrom(s)}</td><td className="tabular-nums">{q.bySource.find((x) => x.source === s)?.canonical ?? 0}</td></tr>)}</Table>
    <p className="mt-2 font-ui text-xs text-ink-3">Example reading: “{sourceCount("MY_POETIC_SIDE")} source poems · {importedFrom("MY_POETIC_SIDE")} imported · {q.pendingReview} require review”.</p>
    <h2 className="eyebrow mt-10 mb-3">Items needing attention</h2>
    <Table head={["Title", "Status", "Flags", "Confidence", ""]}>{q.flagged.map((f) => <tr key={f.id}><td>{f.title}</td><td><Badge tone={f.status === "CONFLICT" || f.status === "LOW_CONFIDENCE" ? "bad" : "warn"}>{f.status}</Badge></td><td className="text-xs text-ink-3">{f.flags.join(", ")}</td><td className="tabular-nums">{Math.round(f.confidence * 100)}%</td><td><Link href={`/admin/import/${f.jobId}`} className="link">review</Link></td></tr>)}{q.flagged.length === 0 && <tr><td colSpan={5} className="text-ink-3">Nothing flagged.</td></tr>}</Table>
    {q.missingDateList.length > 0 && <><h2 className="eyebrow mt-10 mb-3">Poems without a date</h2><ul className="font-ui text-sm columns-2">{q.missingDateList.map((p) => <li key={p.id}><Link href={`/admin/poems/${p.id}`} className="link">{p.title}</Link></li>)}</ul></>}
    {q.undLang.length > 0 && <><h2 className="eyebrow mt-10 mb-3">Poems with unknown language</h2><ul className="font-ui text-sm columns-2">{q.undLang.map((p) => <li key={p.id}><Link href={`/admin/poems/${p.id}`} className="link">{p.title}</Link></li>)}</ul></>}
  </>);
}
