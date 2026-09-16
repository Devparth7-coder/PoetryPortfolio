import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { auditLogs, importItems, importJobs, tags, workSources, workTags, workVersions, works } from "@/infrastructure/db/schema";
import type { ExtractedPoem, SourceKind } from "@/domain/poem/types";
import { contentHash, normalizedHash, preserveText } from "@/domain/poem/text";
import { findDuplicate, type ExistingWorkLite } from "@/domain/import/duplicates";
import { parseMyPoeticSidePoemPage, parseMyPoeticSideListing } from "@/domain/import/parsers/my-poetic-side";
import { parsePoetryComPoemPage, parsePoetryComListing } from "@/domain/import/parsers/poetry-com";
import { parseAnthologyPages } from "@/domain/import/parsers/anthology-pdf";
import { parseCsv, parseGenericHtml, parseJson, parseTextOrMarkdown } from "@/domain/import/parsers/generic";
import { createPoem, NotFoundError } from "@/application/poems/poem-service";
import { slugify } from "@/domain/poem/slug";
import { logger } from "@/infrastructure/logging/logger";
import { extractPdfPages } from "@/infrastructure/pdf/extract";
import { politeFetch } from "@/infrastructure/http/polite-fetch";

export type Actor = { id: string; email: string };
export type ItemResolution = "create" | "merge-source" | "replace-canonical" | "keep-variant" | "skip";

// ---------- Job creation & parsing ----------

export async function createJobFromUrl(url: string, actor: Actor, source?: SourceKind) {
  const u = new URL(url);
  const detected: SourceKind = source ?? (u.hostname.includes("mypoeticside") ? "MY_POETIC_SIDE" : u.hostname.includes("poetry.com") ? "POETRY_COM" : "HTML");
  const [job] = await db.insert(importJobs).values({ source: detected, inputKind: "url", inputUrl: url, inputLabel: url, createdBy: actor.id }).returning();
  try {
    const extracted = await extractFromUrl(url, detected);
    await persistItems(job.id, extracted.poems, extracted.notes);
  } catch (e) {
    await db.update(importJobs).set({ status: "FAILED", error: (e as Error).message }).where(eq(importJobs.id, job.id));
    logger.error("import.url.failed", { jobId: job.id, error: e });
  }
  return job.id;
}

export async function createJobFromContent(opts: { source: SourceKind; content: string | Buffer; label: string; inputKind: "file" | "paste"; url?: string }, actor: Actor) {
  const [job] = await db.insert(importJobs).values({ source: opts.source, inputKind: opts.inputKind, inputLabel: opts.label, inputUrl: opts.url ?? null, createdBy: actor.id }).returning();
  try {
    const { poems, notes } = await extractFromContent(opts.source, opts.content, opts.label, opts.url);
    await persistItems(job.id, poems, notes);
  } catch (e) {
    await db.update(importJobs).set({ status: "FAILED", error: (e as Error).message }).where(eq(importJobs.id, job.id));
    logger.error("import.content.failed", { jobId: job.id, error: e });
  }
  return job.id;
}

export async function extractFromContent(source: SourceKind, content: string | Buffer, label: string, url?: string): Promise<{ poems: ExtractedPoem[]; notes: Record<string, unknown> }> {
  const text = typeof content === "string" ? content : label.toLowerCase().endsWith(".pdf") || source === "PDF" || source === "ANTHOLOGY" ? "" : content.toString("utf8");
  switch (source) {
    case "MY_POETIC_SIDE": {
      const one = parseMyPoeticSidePoemPage(text, url); if (one) return { poems: [one], notes: {} };
      const listing = parseMyPoeticSideListing(text); if (listing.length) return { poems: [], notes: { listing, hint: "Listing page detected — use URL import to fetch each poem, or upload individual poem pages." } };
      return { poems: parseGenericHtml(text, url), notes: { fallback: "generic-html" } };
    }
    case "POETRY_COM": {
      const one = parsePoetryComPoemPage(text, url); if (one) return { poems: [one], notes: {} };
      const listing = parsePoetryComListing(text); if (listing.length) return { poems: [], notes: { listing } };
      return { poems: parseGenericHtml(text, url), notes: { fallback: "generic-html" } };
    }
    case "ANTHOLOGY": case "PDF": {
      const buf = typeof content === "string" ? Buffer.from(content) : content;
      const pages = await extractPdfPages(buf);
      const r = parseAnthologyPages(pages, label);
      if (r.poems.length === 0) { // not an MPS anthology — fallback to text splitting
        const joined = pages.map((p) => p.text).join("\n\n\n\n");
        return { poems: parseTextOrMarkdown(joined).map((p) => ({ ...p, flags: [...p.flags, "pdf-generic-split", "manual-review"], confidence: Math.min(p.confidence, 0.5) })), notes: { pages: pages.length, parser: "generic-pdf" } };
      }
      return { poems: r.poems, notes: { pages: pages.length, parser: "mps-anthology", tocCount: r.tableOfContents.length, frontMatter: Object.keys(r.frontMatter) } };
    }
    case "JSON": return { poems: parseJson(text), notes: {} };
    case "CSV": return { poems: parseCsv(text), notes: {} };
    case "HTML": return { poems: parseGenericHtml(text, url), notes: {} };
    case "MARKDOWN": case "TXT": case "MANUAL": default: return { poems: parseTextOrMarkdown(text), notes: {} };
  }
}

/** Polite crawler: only the author's own public profile pages, throttled, identifiable UA, no anti-bot evasion. */
export async function extractFromUrl(url: string, source: SourceKind): Promise<{ poems: ExtractedPoem[]; notes: Record<string, unknown> }> {
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`Source responded ${res.status}. If the site blocks automated access, upload the saved HTML instead.`);
  const html = await res.text();
  if (source === "MY_POETIC_SIDE") {
    const single = parseMyPoeticSidePoemPage(html, url); if (single) return { poems: [single], notes: {} };
    // profile or listing page → discover all poems via paginated listing
    const userId = url.match(/user-(\d+)/)?.[1] ?? url.match(/ownpoems-(\d+)/)?.[1];
    if (!userId) return { poems: parseGenericHtml(html, url), notes: {} };
    const index = new Map<string, ReturnType<typeof parseMyPoeticSideListing>[number]>();
    for (let page = 1; page <= 20; page++) {
      const r = await politeFetch(`https://mypoeticside.com/all-the-ownpoems-${userId}-${page}`); if (!r.ok) break;
      const list = parseMyPoeticSideListing(await r.text()); let added = 0;
      for (const p of list) if (!index.has(p.id)) { index.set(p.id, p); added++; }
      if (added === 0) break;
    }
    const poems: ExtractedPoem[] = []; const failures: { id: string; title: string; reason: string }[] = [];
    for (const entry of index.values()) {
      try {
        const r = await politeFetch(entry.url); if (!r.ok) { failures.push({ id: entry.id, title: entry.title, reason: `HTTP ${r.status}` }); continue; }
        const p = parseMyPoeticSidePoemPage(await r.text(), entry.url);
        if (!p) { failures.push({ id: entry.id, title: entry.title, reason: "parse-failed" }); continue; }
        p.trending = entry.trending; poems.push(p);
      } catch (e) { failures.push({ id: entry.id, title: entry.title, reason: (e as Error).message }); }
    }
    return { poems, notes: { discovered: index.size, failures } };
  }
  if (source === "POETRY_COM") {
    const single = parsePoetryComPoemPage(html, url); if (single) return { poems: [single], notes: {} };
    const userId = url.match(/user(?:-poems)?\/(\d+)/)?.[1];
    if (!userId) return { poems: parseGenericHtml(html, url), notes: {} };
    const index = new Map<string, ReturnType<typeof parsePoetryComListing>[number]>();
    for (let page = 1; page <= 20; page++) {
      const r = await politeFetch(`https://www.poetry.com/user-poems/${userId}${page > 1 ? `/${page}` : ""}`); if (!r.ok) break;
      const list = parsePoetryComListing(await r.text()); let added = 0;
      for (const p of list) if (!index.has(p.id)) { index.set(p.id, p); added++; }
      if (added === 0) break;
    }
    const poems: ExtractedPoem[] = []; const failures: { id: string; title: string; url: string; reason: string }[] = [];
    for (const entry of index.values()) {
      try {
        const r = await politeFetch(entry.url);
        if (r.status !== 200) { failures.push({ id: entry.id, title: entry.title, url: entry.url, reason: r.status === 202 || r.status === 403 || r.status === 429 ? "blocked-by-site (upload saved HTML)" : `HTTP ${r.status}` }); continue; }
        const p = parsePoetryComPoemPage(await r.text(), entry.url);
        if (!p) { failures.push({ id: entry.id, title: entry.title, url: entry.url, reason: "parse-failed" }); continue; }
        poems.push(p);
      } catch (e) { failures.push({ id: entry.id, title: entry.title, url: entry.url, reason: (e as Error).message }); }
    }
    return { poems, notes: { discovered: index.size, failures } };
  }
  return { poems: parseGenericHtml(html, url), notes: {} };
}

async function loadExisting(): Promise<ExistingWorkLite[]> {
  return db.select({ id: works.id, title: works.title, body: works.body, contentHash: works.contentHash, normalizedHash: works.normalizedHash }).from(works).where(and(isNull(works.deletedAt), eq(works.kind, "POEM")));
}

/** Persist extracted poems as review items with duplicate analysis. Also detects duplicates *within* the batch. */
export async function persistItems(jobId: string, poems: ExtractedPoem[], notes: Record<string, unknown> = {}) {
  const existing = await loadExisting();
  const batchSeen = new Map<string, number>();
  const rows: (typeof importItems.$inferInsert)[] = [];
  const totals: Record<string, number> = { extracted: poems.length, new: 0, duplicateExact: 0, duplicateLikely: 0, conflict: 0, lowConfidence: 0 };
  poems.forEach((p, i) => {
    const body = preserveText(p.body); const title = p.title.trim();
    const ch = contentHash(title, body); const nh = normalizedHash(title, body);
    const flags = [...p.flags];
    let status: typeof importItems.$inferInsert.status = "NEW";
    const m = findDuplicate({ title, body }, existing);
    const matchedWorkId = m.workId; let matchKind: string | null = m.kind === "none" ? null : m.kind; let similarity: number | null = m.kind === "none" ? null : m.similarity;
    if (m.status !== "NEW") status = m.status;
    if (batchSeen.has(nh)) { flags.push(`duplicate-in-batch:#${batchSeen.get(nh)! + 1}`); if (status === "NEW") { status = "DUPLICATE_EXACT"; matchKind = "batch"; similarity = 1; } }
    else batchSeen.set(nh, i);
    if (p.confidence < 0.6 && status === "NEW") status = "LOW_CONFIDENCE";
    if (status === "NEW") totals.new++; else if (status === "DUPLICATE_EXACT") totals.duplicateExact++; else if (status === "DUPLICATE_LIKELY") totals.duplicateLikely++; else if (status === "CONFLICT") totals.conflict++; else if (status === "LOW_CONFIDENCE") totals.lowConfidence++;
    rows.push({ jobId, position: i, status, title: title || "(untitled)", body, language: p.language ?? null, detectedDate: p.date ?? null, sourceUrl: p.sourceUrl ?? null, sourceId: p.sourceId ?? null, sourceCategories: p.categories ?? [], trending: !!p.trending, contentHash: ch, normalizedHash: nh, confidence: p.confidence, flags, matchedWorkId, matchKind, similarity, metadata: { ...(p.metadata ?? {}), dateText: p.dateText ?? null, languageConfidence: p.languageConfidence ?? null } });
  });
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 200) await tx.insert(importItems).values(rows.slice(i, i + 200));
    await tx.update(importJobs).set({ status: rows.length ? "REVIEW" : "PARSED", totals, report: { notes } }).where(eq(importJobs.id, jobId));
  });
  logger.info("import.parsed", { jobId, totals });
  return totals;
}

// ---------- Review & approval ----------

export async function getJob(id: string) {
  const job = await db.query.importJobs.findFirst({ where: eq(importJobs.id, id), with: { items: { orderBy: asc(importItems.position) } } });
  return job ?? null;
}
export async function listJobs(limit = 30) { return db.select().from(importJobs).orderBy(desc(importJobs.createdAt)).limit(limit); }

export async function getItemWithMatch(itemId: string) {
  const item = await db.query.importItems.findFirst({ where: eq(importItems.id, itemId) });
  if (!item) throw new NotFoundError("Import item not found");
  const matched = item.matchedWorkId ? await db.query.works.findFirst({ where: eq(works.id, item.matchedWorkId), with: { sources: true, versions: true } }) : null;
  return { item, matched };
}

export async function setItemResolution(itemId: string, resolution: ItemResolution | null, actor: Actor, overrides?: { title?: string; language?: string; date?: Date | null }) {
  const [it] = await db.update(importItems).set({ resolution, status: resolution === "skip" ? "REJECTED" : resolution ? "APPROVED" : "NEW", metadata: sql`${importItems.metadata} || ${JSON.stringify({ overrides: overrides ?? {}, resolvedBy: actor.email })}::jsonb` }).where(eq(importItems.id, itemId)).returning();
  return it;
}

/** Bulk: approve all NEW items as "create" and all exact duplicates as "merge-source". Conflicts & low-confidence stay untouched — must be resolved manually. */
export async function autoResolveSafe(jobId: string) {
  await db.update(importItems).set({ resolution: "create", status: "APPROVED" }).where(and(eq(importItems.jobId, jobId), eq(importItems.status, "NEW")));
  await db.update(importItems).set({ resolution: "merge-source", status: "APPROVED" }).where(and(eq(importItems.jobId, jobId), eq(importItems.status, "DUPLICATE_EXACT"), sql`${importItems.matchedWorkId} IS NOT NULL`));
}

/** Execute all APPROVED items of a job inside one transaction. Never overwrites an existing poem body unless resolution is replace-canonical (explicit). */
export async function executeJob(jobId: string, actor: Actor, opts: { publish?: boolean } = {}) {
  const job = await getJob(jobId); if (!job) throw new NotFoundError("Job not found");
  const approved = job.items.filter((i) => i.status === "APPROVED" && i.resolution && i.resolution !== "skip");
  const report: { created: { id: string; title: string; slug: string }[]; merged: { id: string; title: string }[]; replaced: { id: string; title: string }[]; variants: { id: string; title: string }[]; skipped: number; pending: number; errors: { itemId: string; title: string; error: string }[] } = { created: [], merged: [], replaced: [], variants: [], skipped: job.items.filter((i) => i.status === "REJECTED").length, pending: 0, errors: [] };
  const sourceKind = job.source;

  await db.transaction(async (tx) => {
    const genreTagCache = new Map<string, string>();
    const tagFor = async (name: string) => {
      const slug = slugify(name); if (genreTagCache.has(slug)) return genreTagCache.get(slug)!;
      const [t] = await tx.insert(tags).values({ slug, name, kind: "source-genre" }).onConflictDoUpdate({ target: tags.slug, set: { name } }).returning();
      genreTagCache.set(slug, t.id); return t.id;
    };
    for (const item of approved) {
      const overrides = (item.metadata as { overrides?: { title?: string; language?: string; date?: string | null } }).overrides ?? {};
      const title = overrides.title ?? item.title; const language = overrides.language ?? item.language ?? "en";
      const date = overrides.date !== undefined ? (overrides.date ? new Date(overrides.date) : null) : item.detectedDate;
      const provenance = { source: sourceKind, sourceUrl: item.sourceUrl, sourceId: item.sourceId ?? (item.sourceUrl ? item.sourceUrl : `${job.id}:${item.position}`), sourceTitle: item.title, sourcePublishedAt: item.detectedDate, sourceCategories: item.sourceCategories, sourceMetadata: { ...item.metadata, jobId }, contentHash: item.contentHash, importItemId: item.id };
      try {
        if (item.resolution === "create") {
          const w = await createPoem({ title, body: item.body, language, status: opts.publish ? "PUBLISHED" : "DRAFT", writtenAt: date, publishedAt: opts.publish ? date ?? new Date() : null, metadata: { trendingAtSource: item.trending, importJobId: jobId } }, actor, { tx, versionKind: "ORIGINAL", changeNote: `Imported from ${sourceKind}` });
          if (item.trending) await tx.update(works).set({ trendingAtSource: true }).where(eq(works.id, w.id));
          await tx.insert(workSources).values({ ...provenance, workId: w.id, isCanonical: true }).onConflictDoNothing();
          for (const g of item.sourceCategories) await tx.insert(workTags).values({ workId: w.id, tagId: await tagFor(g), origin: "SOURCE", approved: true }).onConflictDoNothing();
          await tx.update(importItems).set({ status: "IMPORTED", resultWorkId: w.id }).where(eq(importItems.id, item.id));
          report.created.push({ id: w.id, title: w.title, slug: w.slug });
        } else if (item.matchedWorkId && (item.resolution === "merge-source" || item.resolution === "keep-variant")) {
          const target = await tx.query.works.findFirst({ where: eq(works.id, item.matchedWorkId) }); if (!target) throw new Error("Matched poem no longer exists");
          await tx.insert(workSources).values({ ...provenance, workId: target.id, isCanonical: false }).onConflictDoNothing();
          if (item.resolution === "keep-variant" && item.contentHash !== target.contentHash) {
            const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(version),0)::int` }).from(workVersions).where(eq(workVersions.workId, target.id));
            await tx.insert(workVersions).values({ workId: target.id, version: max + 1, kind: "SOURCE_VARIANT", title, body: item.body, language, contentHash: item.contentHash, changeNote: `Variant from ${sourceKind}`, createdBy: actor.id, snapshot: { sourceUrl: item.sourceUrl } });
            report.variants.push({ id: target.id, title });
          } else report.merged.push({ id: target.id, title });
          if (item.trending && !target.trendingAtSource) await tx.update(works).set({ trendingAtSource: true }).where(eq(works.id, target.id));
          if (!target.writtenAt && date) await tx.update(works).set({ writtenAt: date }).where(eq(works.id, target.id));
          for (const g of item.sourceCategories) await tx.insert(workTags).values({ workId: target.id, tagId: await tagFor(g), origin: "SOURCE", approved: true }).onConflictDoNothing();
          await tx.update(importItems).set({ status: "MERGED", resultWorkId: target.id }).where(eq(importItems.id, item.id));
        } else if (item.matchedWorkId && item.resolution === "replace-canonical") {
          const target = await tx.query.works.findFirst({ where: eq(works.id, item.matchedWorkId) }); if (!target) throw new Error("Matched poem no longer exists");
          const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(version),0)::int` }).from(workVersions).where(eq(workVersions.workId, target.id));
          const { computeDerived } = await import("@/application/poems/poem-service");
          const d = computeDerived(title, item.body);
          await tx.insert(workVersions).values({ workId: target.id, version: max + 1, kind: "EDITED", title, body: d.body, language, contentHash: d.contentHash, changeNote: `Canonical text replaced from ${sourceKind} (previous version preserved)`, createdBy: actor.id });
          await tx.update(works).set({ title, body: d.body, language, wordCount: d.wordCount, characterCount: d.characterCount, lineCount: d.lineCount, readingTimeSeconds: d.readingTimeSeconds, contentHash: d.contentHash, normalizedHash: d.normalizedHash, version: max + 1, updatedAt: new Date(), updatedBy: actor.id }).where(eq(works.id, target.id));
          await tx.update(workSources).set({ isCanonical: false }).where(eq(workSources.workId, target.id));
          await tx.insert(workSources).values({ ...provenance, workId: target.id, isCanonical: true }).onConflictDoNothing();
          await tx.update(importItems).set({ status: "IMPORTED", resultWorkId: target.id }).where(eq(importItems.id, item.id));
          report.replaced.push({ id: target.id, title });
        } else {
          report.errors.push({ itemId: item.id, title: item.title, error: `Unsupported resolution ${item.resolution} without a matched poem` });
        }
      } catch (e) {
        throw new Error(`Item “${item.title}”: ${(e as Error).message}`);
      }
    }
    report.pending = job.items.filter((i) => ["NEW", "DUPLICATE_EXACT", "DUPLICATE_LIKELY", "CONFLICT", "LOW_CONFIDENCE"].includes(i.status)).length;
    await tx.update(importJobs).set({ status: report.pending ? "REVIEW" : "COMPLETED", completedAt: report.pending ? null : new Date(), report: { ...(job.report as object), execution: report, executedAt: new Date().toISOString() }, totals: { ...(job.totals as object), created: report.created.length, merged: report.merged.length, replaced: report.replaced.length, variants: report.variants.length } }).where(eq(importJobs.id, jobId));
    await tx.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "import.execute", entityType: "import_job", entityId: jobId, summary: `Imported ${report.created.length} new, merged ${report.merged.length}, variants ${report.variants.length}, replaced ${report.replaced.length}`, diff: { errors: report.errors } });
  });
  logger.info("import.executed", { jobId, created: report.created.length, merged: report.merged.length, variants: report.variants.length, errors: report.errors.length });
  return report;
}

export async function rejectJob(jobId: string, actor: Actor) {
  await db.update(importJobs).set({ status: "REJECTED", completedAt: new Date() }).where(eq(importJobs.id, jobId));
  await db.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "import.reject", entityType: "import_job", entityId: jobId });
}
