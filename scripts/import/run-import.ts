/**
 * Runs the full ingestion pipeline against the locally saved source snapshots (./sources):
 *   1. My Poetic Side poem pages (156)         → canonical texts, dates, trending flags
 *   2. Poetry.com poem pages (whatever fetched) → merged as additional provenance, genres → tags; conflicts left for review
 *   3. Anthology PDF                            → merged as ANTHOLOGY provenance; garbled (non-Latin) pages flagged
 * Everything goes through the same ImportJob → ImportItem → approve → execute path the admin UI uses.
 * Usage: npm run import:run [-- --publish]
 */
import { loadEnv } from "../env"; loadEnv();
import fs from "node:fs"; import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, pgClient } from "../../src/infrastructure/db/client";
import { adminUsers, importItems, importJobs, works } from "../../src/infrastructure/db/schema";
import { parseMyPoeticSidePoemPage } from "../../src/domain/import/parsers/my-poetic-side";
import { parsePoetryComPoemPage } from "../../src/domain/import/parsers/poetry-com";
import { parseAnthologyPages } from "../../src/domain/import/parsers/anthology-pdf";
import { extractPdfPages } from "../../src/infrastructure/pdf/extract";
import { persistItems, autoResolveSafe, executeJob } from "../../src/application/import/import-service";
import type { ExtractedPoem } from "../../src/domain/poem/types";

const ROOT = path.resolve(process.cwd(), "sources");
const publish = process.argv.includes("--publish");

async function main() {
  const admin = (await db.select().from(adminUsers).limit(1))[0]; if (!admin) throw new Error("Run db:seed first");
  const actor = { id: admin.id, email: admin.email };
  const summary: Record<string, unknown> = {};

  // ---- 1. My Poetic Side
  const mpsIndex: { id: string; title: string; trending: boolean; dateText: string | null }[] = JSON.parse(fs.readFileSync(`${ROOT}/mps-index.json`, "utf8"));
  const mpsPoems: ExtractedPoem[] = []; const mpsFailures: unknown[] = [];
  for (const e of mpsIndex) {
    const f = `${ROOT}/raw/mps/${e.id}.html`;
    if (!fs.existsSync(f)) { mpsFailures.push({ id: e.id, title: e.title, reason: "snapshot-missing" }); continue; }
    const p = parseMyPoeticSidePoemPage(fs.readFileSync(f, "utf8"), `https://mypoeticside.com/show-poem-${e.id}`);
    if (!p) { mpsFailures.push({ id: e.id, title: e.title, reason: "parse-failed" }); continue; }
    p.trending = e.trending; mpsPoems.push(p);
  }
  const [mpsJob] = await db.insert(importJobs).values({ source: "MY_POETIC_SIDE", inputKind: "url", inputUrl: "https://mypoeticside.com/user-51801", inputLabel: "My Poetic Side — full profile (local snapshot)", createdBy: admin.id }).returning();
  await persistItems(mpsJob.id, mpsPoems, { indexed: mpsIndex.length, failures: mpsFailures, snapshotDir: "sources/raw/mps" });
  await autoResolveSafe(mpsJob.id);
  const mpsReport = await executeJob(mpsJob.id, actor, { publish });
  summary.myPoeticSide = { indexed: mpsIndex.length, parsed: mpsPoems.length, created: mpsReport.created.length, merged: mpsReport.merged.length, pending: mpsReport.pending, failures: mpsFailures };
  console.log("My Poetic Side:", summary.myPoeticSide);

  // ---- 2. Poetry.com
  const pcIndex: { id: string; slug: string; title: string; url: string }[] = JSON.parse(fs.readFileSync(`${ROOT}/pc-index.json`, "utf8"));
  const pcPoems: ExtractedPoem[] = []; const pcMissing: unknown[] = [];
  for (const e of pcIndex) {
    const f = `${ROOT}/raw/pc/${e.id}.html`;
    const html = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
    const p = html.includes("disp-quote-body") ? parsePoetryComPoemPage(html, e.url) : null;
    if (!p) { pcMissing.push({ id: e.id, title: e.title, url: e.url, reason: "page not retrievable automatically (site returned a challenge) — upload saved HTML via /admin/import", action: "manual-html-upload" }); continue; }
    pcPoems.push(p);
  }
  const [pcJob] = await db.insert(importJobs).values({ source: "POETRY_COM", inputKind: "url", inputUrl: "https://www.poetry.com/user/318517/devparth9784", inputLabel: "Poetry.com — profile (local snapshot)", createdBy: admin.id }).returning();
  await persistItems(pcJob.id, pcPoems, { indexed: pcIndex.length, notRetrievable: pcMissing, snapshotDir: "sources/raw/pc" });
  await autoResolveSafe(pcJob.id);
  const pcReport = await executeJob(pcJob.id, actor, { publish });
  summary.poetryCom = { indexed: pcIndex.length, parsed: pcPoems.length, created: pcReport.created.length, merged: pcReport.merged.length, pending: pcReport.pending, notRetrievable: pcMissing.length };
  console.log("Poetry.com:", summary.poetryCom);

  // ---- 3. Anthology PDF
  const pdfPath = `${ROOT}/anthology-51801.pdf`;
  if (fs.existsSync(pdfPath)) {
    const pages = await extractPdfPages(fs.readFileSync(pdfPath));
    const r = parseAnthologyPages(pages, "mypoeticside-anthology-51801.pdf");
    const [pdfJob] = await db.insert(importJobs).values({ source: "ANTHOLOGY", inputKind: "file", inputUrl: "https://mypoeticside.com/pdfs/51801.pdf", inputLabel: "Anthology of Dev Parth (190-page PDF)", createdBy: admin.id }).returning();
    await persistItems(pdfJob.id, r.poems, { pages: pages.length, toc: r.tableOfContents.length, frontMatter: r.frontMatter });
    await autoResolveSafe(pdfJob.id);
    const pdfReport = await executeJob(pdfJob.id, actor, { publish });
    summary.anthology = { pages: pages.length, extracted: r.poems.length, created: pdfReport.created.length, merged: pdfReport.merged.length, variants: pdfReport.variants.length, pending: pdfReport.pending };
    console.log("Anthology:", summary.anthology);
  }

  // ---- Manifest of anything not fully imported
  const pending = await db.select({ id: importItems.id, jobId: importItems.jobId, title: importItems.title, status: importItems.status, flags: importItems.flags, sourceUrl: importItems.sourceUrl, confidence: importItems.confidence }).from(importItems).where(and(eq(importItems.status, importItems.status)));
  const open = pending.filter((p) => ["NEW", "DUPLICATE_LIKELY", "CONFLICT", "LOW_CONFIDENCE", "DUPLICATE_EXACT"].includes(p.status));
  const total = (await db.select({ id: works.id }).from(works)).length;
  const manifest = { generatedAt: new Date().toISOString(), totalPoemsInArchive: total, sources: summary, requiresManualAction: [
    ...open.map((p) => ({ title: p.title, status: p.status, flags: p.flags, sourceUrl: p.sourceUrl, reason: p.status === "LOW_CONFIDENCE" ? "Text extraction confidence too low (non-Latin text unrecoverable from PDF)" : p.status === "CONFLICT" ? "Text differs from an existing version — choose canonical in /admin/import" : "Needs review", requiredAction: "Review in /admin/import" })),
    ...(summary.poetryCom as { notRetrievable: number }).notRetrievable ? (JSON.parse(JSON.stringify(pcMissing)) as unknown[]) : [],
  ] };
  fs.mkdirSync(`${ROOT}/reports`, { recursive: true });
  fs.writeFileSync(`${ROOT}/reports/import-manifest.json`, JSON.stringify(manifest, null, 2));
  console.log(`\n✔ Archive now holds ${total} poems. Manifest: sources/reports/import-manifest.json (${manifest.requiresManualAction.length} items need attention)`);
  await pgClient.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
