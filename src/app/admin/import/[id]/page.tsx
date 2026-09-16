import { notFound } from "next/navigation";
import { getJob } from "@/application/import/import-service";
import { PageTitle, Badge } from "@/components/admin/ui";
import { ImportReview } from "@/components/admin/import-review";
import { SOURCE_LABELS, type SourceKind } from "@/domain/poem/types";
export default async function ImportJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/.test(id)) notFound(); const job = await getJob(id); if (!job) notFound();
  return (<><PageTitle eyebrow={`Import · ${SOURCE_LABELS[job.source as SourceKind]}`} title={job.inputLabel ?? "Import job"} action={<Badge tone={job.status === "COMPLETED" ? "good" : job.status === "FAILED" ? "bad" : "info"}>{job.status}</Badge>} />{job.error && <p role="alert" className="mb-6 rounded border border-red-700/40 px-3 py-2 font-ui text-sm text-red-800">{job.error}</p>}<ImportReview job={JSON.parse(JSON.stringify(job))} /></>);
}
