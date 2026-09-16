/** Requires DATABASE_URL (migrated). Exercises dedupe + versioning end-to-end through the service layer, then cleans up. */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, like, inArray } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { works, workSources, workVersions, importJobs, importItems, adminUsers } from "@/infrastructure/db/schema";
import { createJobFromContent, getJob, autoResolveSafe, executeJob, setItemResolution } from "@/application/import/import-service";
import { getAdminPoem } from "@/application/poems/poem-service";
let actor = { id: "", email: "" };
const TAG = "vitest-" + Date.now();
const poemA = `${TAG} Alpha\n\nFirst line, with comma\n  indented second\n\nthird after blank`;
const skip = !process.env.DATABASE_URL;
describe.skipIf(skip)("import flow", () => {
  const created: string[] = [];
  beforeAll(async () => { const [u] = await db.select({ id: adminUsers.id, email: adminUsers.email }).from(adminUsers).limit(1); if (!u) throw new Error("run db:seed first"); actor = u; });
  afterAll(async () => {
    const ids = (await db.select({ id: works.id }).from(works).where(like(works.title, `${TAG}%`))).map((r) => r.id);
    if (ids.length) { await db.delete(workVersions).where(inArray(workVersions.workId, ids)); await db.delete(workSources).where(inArray(workSources.workId, ids)); await db.delete(works).where(inArray(works.id, ids)); }
    const jobs = (await db.select({ id: importJobs.id }).from(importJobs).where(like(importJobs.inputLabel, `${TAG}%`))).map((r) => r.id);
    if (jobs.length) { await db.delete(importItems).where(inArray(importItems.jobId, jobs)); await db.delete(importJobs).where(inArray(importJobs.id, jobs)); }
  });
  it("creates a new poem preserving exact text", async () => {
    const jobId = await createJobFromContent({ source: "MANUAL", content: poemA, label: `${TAG}-1`, inputKind: "paste" }, actor);
    const j = (await getJob(jobId))!; expect(j.items[0].status).toBe("NEW");
    await autoResolveSafe(jobId); const r = await executeJob(jobId, actor, { publish: false });
    expect(r.created).toHaveLength(1); created.push(r.created[0].id);
    const p = (await getAdminPoem(r.created[0].id))!; expect(p.body).toBe("First line, with comma\n  indented second\n\nthird after blank"); expect(p.status).toBe("DRAFT"); expect(p.versions.length).toBeGreaterThanOrEqual(1);
  });
  it("detects exact duplicate and merges as a source without changing text", async () => {
    const jobId = await createJobFromContent({ source: "TXT", content: poemA, label: `${TAG}-2`, inputKind: "paste" }, actor);
    const j = (await getJob(jobId))!; expect(j.items[0].status).toBe("DUPLICATE_EXACT"); expect(j.items[0].matchedWorkId).toBe(created[0]);
    await autoResolveSafe(jobId); const r = await executeJob(jobId, actor); expect(r.merged).toHaveLength(1);
    const srcs = await db.select().from(workSources).where(eq(workSources.workId, created[0])); expect(srcs.map((s) => s.source).sort()).toEqual(["MANUAL", "TXT"]);
  });
  it("flags a near-duplicate as CONFLICT, and replace-canonical keeps the old text as a version", async () => {
    const changed = poemA.replace("third after blank", "third after the blank");
    const jobId = await createJobFromContent({ source: "MANUAL", content: changed, label: `${TAG}-3`, inputKind: "paste" }, actor);
    const j = (await getJob(jobId))!; expect(["CONFLICT", "DUPLICATE_LIKELY"]).toContain(j.items[0].status);
    await autoResolveSafe(jobId); expect((await getJob(jobId))!.items[0].resolution).toBeNull(); // never auto-resolved
    await setItemResolution(j.items[0].id, "replace-canonical", actor); const r = await executeJob(jobId, actor); expect(r.replaced).toHaveLength(1);
    const p = (await getAdminPoem(created[0]))!; expect(p.body).toContain("third after the blank"); expect(p.versions.some((v) => v.body.includes("third after blank") && !v.body.includes("the blank"))).toBe(true);
  });
});
