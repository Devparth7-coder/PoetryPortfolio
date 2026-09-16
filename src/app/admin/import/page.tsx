import Link from "next/link";
import { listJobs } from "@/application/import/import-service";
import { PageTitle, Badge, Table } from "@/components/admin/ui";
import { ImportForm } from "@/components/admin/import-form";
import { formatDate } from "@/lib/format";
import { SOURCE_LABELS, type SourceKind } from "@/domain/poem/types";
export default async function AdminImport() {
  const jobs = await listJobs(50);
  return (<>
    <PageTitle eyebrow="Ingestion" title="Import poems" />
    <ImportForm />
    <h2 className="eyebrow mt-12 mb-3">Import jobs</h2>
    <Table head={["Source", "Input", "Status", "Extracted", "New", "Dupes", "Conflicts", "Review", "Created"]}>
      {jobs.map((j) => { const t = j.totals as Record<string, number>; return (<tr key={j.id}><td>{SOURCE_LABELS[j.source as SourceKind]}</td><td className="max-w-[18rem] truncate"><Link href={`/admin/import/${j.id}`} className="link">{j.inputLabel}</Link></td><td><Badge tone={j.status === "COMPLETED" ? "good" : j.status === "FAILED" || j.status === "REJECTED" ? "bad" : "info"}>{j.status}</Badge></td><td className="tabular-nums">{t.extracted ?? 0}</td><td className="tabular-nums">{t.created ?? t.new ?? 0}</td><td className="tabular-nums">{(t.duplicateExact ?? 0) + (t.duplicateLikely ?? 0)}</td><td className="tabular-nums">{t.conflict ?? 0}</td><td className="tabular-nums">{t.lowConfidence ?? 0}</td><td className="text-ink-3">{formatDate(j.createdAt, { month: "short" })}</td></tr>); })}
      {jobs.length === 0 && <tr><td colSpan={9} className="text-ink-3">No imports yet.</td></tr>}
    </Table>
  </>);
}
