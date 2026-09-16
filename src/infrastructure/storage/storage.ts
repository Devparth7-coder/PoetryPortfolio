import fs from "node:fs/promises"; import path from "node:path";
/** Storage abstraction: local disk (default) or S3-compatible (R2/S3) via env. Same interface for both. */
export interface Storage { put(key: string, data: Buffer, contentType: string): Promise<string>; delete(key: string): Promise<void>; publicUrl(key: string): string }

class LocalStorage implements Storage {
  constructor(private dir: string) {}
  async put(key: string, data: Buffer) { const p = path.join(this.dir, key); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, data); return this.publicUrl(key); }
  async delete(key: string) { await fs.rm(path.join(this.dir, key), { force: true }); }
  publicUrl(key: string) { return `/media/${key}`; }
}

class S3Storage implements Storage {
  private endpoint = process.env.S3_ENDPOINT!; private bucket = process.env.S3_BUCKET!; private region = process.env.S3_REGION ?? "auto"; private base = process.env.S3_PUBLIC_BASE_URL!;
  async put(key: string, data: Buffer, contentType: string) { await this.request("PUT", key, data, contentType); return this.publicUrl(key); }
  async delete(key: string) { await this.request("DELETE", key); }
  publicUrl(key: string) { return `${this.base.replace(/\/$/, "")}/${key}`; }
  /** Minimal SigV4 signer (no SDK dependency). */
  private async request(method: string, key: string, body?: Buffer, contentType?: string) {
    const { createHmac, createHash } = await import("node:crypto");
    const host = new URL(this.endpoint).host; const now = new Date(); const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); const date = amz.slice(0, 8);
    const payloadHash = createHash("sha256").update(body ?? "").digest("hex");
    const headers: Record<string, string> = { host, "x-amz-content-sha256": payloadHash, "x-amz-date": amz, ...(contentType ? { "content-type": contentType } : {}) };
    const signed = Object.keys(headers).sort(); const canonical = [method, `/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`, "", ...signed.map((h) => `${h}:${headers[h]}`), "", signed.join(";"), payloadHash].join("\n");
    const scope = `${date}/${this.region}/s3/aws4_request`; const sts = ["AWS4-HMAC-SHA256", amz, scope, createHash("sha256").update(canonical).digest("hex")].join("\n");
    const k = ["AWS4" + process.env.S3_SECRET_ACCESS_KEY!, date, this.region, "s3", "aws4_request"].reduce<Buffer | string>((acc, v, i) => (i === 0 ? v : createHmac("sha256", acc).update(v).digest()), "") as Buffer;
    const sig = createHmac("sha256", k).update(sts).digest("hex");
    const res = await fetch(`${this.endpoint}/${this.bucket}/${key}`, { method, body: body ? new Uint8Array(body) : undefined, headers: { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${process.env.S3_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signed.join(";")}, Signature=${sig}` } });
    if (!res.ok && res.status !== 204) throw new Error(`Storage ${method} failed: ${res.status}`);
  }
}
export const storage: Storage = process.env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage(path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_LOCAL_DIR ?? "./public/media"));
