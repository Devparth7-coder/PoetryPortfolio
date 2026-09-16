import { db } from "@/infrastructure/db/client"; import { auditLogs } from "@/infrastructure/db/schema"; import { desc } from "drizzle-orm";
import { PageTitle, Table } from "@/components/admin/ui";
export default async function Audit({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1); const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100).offset((page - 1) * 100);
  return (<><PageTitle eyebrow="Security" title="Audit log" /><Table head={["When", "Actor", "Action", "Entity", "Summary"]}>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-ink-3">{r.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td><td>{r.actorEmail ?? "system"}</td><td className="font-medium">{r.action}</td><td className="text-ink-3">{r.entityType}{r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}</td><td>{r.summary}</td></tr>)}</Table><nav className="mt-4 flex justify-between font-ui text-xs">{page > 1 && <a href={`?page=${page - 1}`} className="link">← Newer</a>}{rows.length === 100 && <a href={`?page=${page + 1}`} className="link ml-auto">Older →</a>}</nav></>);
}
