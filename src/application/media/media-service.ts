import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { desc, eq } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { auditLogs, media } from "@/infrastructure/db/schema";
import { storage } from "@/infrastructure/storage/storage";

const MAX_BYTES = 10 * 1024 * 1024;
const SIZES = [480, 960, 1600];
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8, "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/webp": (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP", "image/avif": (b) => b.subarray(4, 12).toString().includes("ftyp"),
};

/** Validates (size, MIME via magic bytes), strips metadata, generates AVIF/WebP responsive variants, stores originals as re-encoded WebP. */
export async function uploadImage(file: { name: string; type: string; buffer: Buffer }, altText: string | null, actor: { id: string; email: string }) {
  if (file.buffer.length > MAX_BYTES) throw new MediaError("Image exceeds 10 MB");
  const check = MAGIC[file.type]; if (!check || !check(file.buffer)) throw new MediaError("Unsupported or mismatched image type (JPEG, PNG, WebP, AVIF only)");
  const img = sharp(file.buffer, { failOn: "error" }).rotate(); const meta = await img.metadata();
  if (!meta.width || !meta.height || meta.width > 12000 || meta.height > 12000) throw new MediaError("Invalid image dimensions");
  const checksum = createHash("sha256").update(file.buffer).digest("hex");
  const existing = await db.query.media.findFirst({ where: eq(media.checksum, checksum) }); if (existing) return existing;
  const id = randomUUID(); const base = `uploads/${id}`;
  const original = await img.clone().webp({ quality: 88 }).toBuffer();
  const url = await storage.put(`${base}/original.webp`, original, "image/webp");
  const variants: { width: number; url: string; format: string }[] = [];
  for (const w of SIZES.filter((w) => w < (meta.width ?? 0))) {
    for (const [fmt, opts] of [["avif", { quality: 55 }], ["webp", { quality: 80 }]] as const) {
      const buf = await img.clone().resize({ width: w, withoutEnlargement: true }).toFormat(fmt, opts).toBuffer();
      variants.push({ width: w, format: fmt, url: await storage.put(`${base}/${w}.${fmt}`, buf, `image/${fmt}`) });
    }
  }
  const [row] = await db.insert(media).values({ storageKey: base, url, mimeType: "image/webp", sizeBytes: original.length, width: meta.width, height: meta.height, altText, variants, checksum, uploadedBy: actor.id, metadata: { originalName: file.name.slice(0, 200), originalType: file.type } }).returning();
  await db.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "media.upload", entityType: "media", entityId: row.id, summary: file.name });
  return row;
}
export async function updateMedia(id: string, patch: { altText?: string | null; caption?: string | null }, actor: { id: string; email: string }) {
  const [row] = await db.update(media).set(patch).where(eq(media.id, id)).returning(); await db.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "media.update", entityType: "media", entityId: id }); return row;
}
export async function deleteMedia(id: string, actor: { id: string; email: string }) {
  const m = await db.query.media.findFirst({ where: eq(media.id, id) }); if (!m) return;
  await storage.delete(`${m.storageKey}/original.webp`); for (const v of m.variants) await storage.delete(`${m.storageKey}/${v.width}.${v.format}`).catch(() => {});
  await db.delete(media).where(eq(media.id, id)); await db.insert(auditLogs).values({ actorId: actor.id, actorEmail: actor.email, action: "media.delete", entityType: "media", entityId: id });
}
export async function listMedia() { return db.select().from(media).orderBy(desc(media.createdAt)).limit(200); }
export class MediaError extends Error { status = 400; }
