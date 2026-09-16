import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { createJobFromContent, createJobFromUrl, listJobs } from "@/application/import/import-service";
import type { SourceKind } from "@/domain/poem/types";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME: Record<string, SourceKind> = { "application/pdf": "PDF", "text/html": "HTML", "text/plain": "TXT", "text/markdown": "MARKDOWN", "text/csv": "CSV", "application/json": "JSON" };
const EXT: Record<string, SourceKind> = { pdf: "PDF", html: "HTML", htm: "HTML", txt: "TXT", md: "MARKDOWN", markdown: "MARKDOWN", csv: "CSV", json: "JSON" };
const SOURCES = ["MY_POETIC_SIDE", "POETRY_COM", "ANTHOLOGY", "MANUAL", "PDF", "MARKDOWN", "TXT", "CSV", "JSON", "HTML"] as const;

export const GET = adminHandler(async () => ok(await listJobs()));

/** multipart: file (+ source, url) | JSON: { url, source? } | JSON: { text, source, label } */
export const POST = adminHandler(async (req, _c, user) => {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData(); const file = form.get("file"); if (!(file instanceof File)) return fail(400, "no_file", "Attach a file");
    if (file.size > MAX_BYTES) return fail(413, "too_large", "File exceeds 25 MB"); if (file.size === 0) return fail(400, "empty_file", "File is empty");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""; const byExt = EXT[ext]; const byMime = ALLOWED_MIME[file.type.split(";")[0]];
    if (!byExt && !byMime) return fail(415, "unsupported_type", "Supported: PDF, HTML, TXT, MD, CSV, JSON");
    const buf = Buffer.from(await file.arrayBuffer());
    // MIME sniffing: PDFs must start with %PDF; text types must be valid UTF-8 without NUL bytes
    if ((byExt === "PDF" || byMime === "PDF") && buf.subarray(0, 5).toString("latin1") !== "%PDF-") return fail(415, "invalid_pdf", "File is not a valid PDF");
    if (byExt !== "PDF" && buf.includes(0)) return fail(415, "binary_content", "Text upload contains binary data");
    const declared = form.get("source"); const source = (typeof declared === "string" && SOURCES.includes(declared as never) ? declared : byExt ?? byMime) as SourceKind;
    const url = form.get("url"); const jobId = await createJobFromContent({ source, content: byExt === "PDF" || byMime === "PDF" ? buf : buf.toString("utf8"), label: file.name.slice(0, 200), inputKind: "file", url: typeof url === "string" && url ? url : undefined }, user);
    return ok({ jobId }, { status: 201 });
  }
  const body = z.union([z.object({ url: z.string().url().max(500), source: z.enum(SOURCES).optional() }), z.object({ text: z.string().min(1).max(2_000_000), source: z.enum(SOURCES).default("MANUAL"), label: z.string().max(200).default("Pasted text"), url: z.string().url().max(500).optional() })]).parse(await req.json());
  if ("url" in body && !("text" in body)) return ok({ jobId: await createJobFromUrl(body.url, user, body.source) }, { status: 201 });
  const t = body as { text: string; source: SourceKind; label: string; url?: string };
  return ok({ jobId: await createJobFromContent({ source: t.source, content: t.text, label: t.label, inputKind: "paste", url: t.url }, user) }, { status: 201 });
});
