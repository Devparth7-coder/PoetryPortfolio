import { listPoems } from "@/application/poems/poem-service";
import { db } from "@/infrastructure/db/client"; import { works } from "@/infrastructure/db/schema"; import { inArray } from "drizzle-orm";
import { SITE, abs, poemPath } from "@/lib/site";
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
export async function buildRss(opts: { title: string; path: string; limit?: number }) {
  const { items } = await listPoems({ limit: opts.limit ?? 30 });
  const bodies = new Map((await db.select({ id: works.id, body: works.body }).from(works).where(inArray(works.id, items.map((i) => i.id)))).map((r) => [r.id, r.body]));
  const now = new Date().toUTCString();
  const entries = items.map((p) => { const d = (p.writtenAt ?? p.publishedAt ?? new Date()).toUTCString(); const url = abs(poemPath(p.slug)); const html = `<div style="white-space:pre-wrap;font-family:Georgia,serif">${esc(bodies.get(p.id) ?? "")}</div><p><a href="${url}">Read on the archive</a></p>`; return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${d}</pubDate><dc:creator>Dev Parth</dc:creator>${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}<content:encoded><![CDATA[${html}]]></content:encoded></item>`; }).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${esc(opts.title)}</title><link>${SITE.url}</link><description>${esc(SITE.description)}</description><language>en</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${abs(opts.path)}" rel="self" type="application/rss+xml"/>${entries}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400" } });
}
