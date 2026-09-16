import type { ExtractedPoem } from "@/domain/poem/types";
import { detectLanguage } from "@/domain/poem/language";
import { preserveText } from "@/domain/poem/text";
import { htmlFragmentToText } from "../html-to-text";
import * as cheerio from "cheerio";

function finish(p: Partial<ExtractedPoem> & { title: string; body: string }): ExtractedPoem {
  const body = preserveText(p.body);
  const lang = detectLanguage(body);
  const flags = [...(p.flags ?? [])];
  if (!p.date) flags.push("missing-date");
  if (!p.title.trim()) flags.push("no-title");
  return { confidence: p.title.trim() ? 0.85 : 0.5, categories: [], trending: false, date: null, dateText: null, sourceUrl: null, sourceId: null, metadata: {}, ...p, body, language: p.language ?? lang.language, languageConfidence: p.languageConfidence ?? lang.confidence, flags };
}

/** Plain text / Markdown: poems separated by a line of `---` or `***` or 3+ blank lines, first line (or `# Heading`) = title. */
export function parseTextOrMarkdown(input: string): ExtractedPoem[] {
  const text = preserveText(input);
  const chunks = text.split(/\n[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*\n|\n{4,}/g).map((c) => c.replace(/^\n+|\n+$/g, "")).filter(Boolean);
  return chunks.map((chunk) => {
    const lines = chunk.split("\n");
    let title = lines[0].replace(/^#+\s*/, "").trim();
    let body = lines.slice(1).join("\n").replace(/^\n+/, "");
    const dateMatch = body.match(/^(?:date|published|written):\s*(.+)$/im);
    let date: Date | null = null;
    if (dateMatch) { const d = new Date(dateMatch[1].trim()); if (!isNaN(d.getTime())) date = d; body = body.replace(dateMatch[0], "").replace(/^\n+/, ""); }
    if (!body.trim()) { body = title; title = ""; }
    return finish({ title, body, date, dateText: dateMatch?.[1]?.trim() ?? null, flags: lines.length < 3 ? ["very-short-body"] : [] });
  });
}

export function parseJson(input: string): ExtractedPoem[] {
  const data = JSON.parse(input);
  const arr: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.poems) ? data.poems : [data];
  return arr.map((raw) => {
    const r = raw as Record<string, unknown>;
    const title = String(r.title ?? r.name ?? "");
    const body = String(r.body ?? r.text ?? r.content ?? r.poem ?? "");
    const dateRaw = r.date ?? r.publishedAt ?? r.published ?? r.createdAt;
    const d = dateRaw ? new Date(String(dateRaw)) : null;
    return finish({ title, body, date: d && !isNaN(d.getTime()) ? d : null, dateText: dateRaw ? String(dateRaw) : null, sourceUrl: r.url ? String(r.url) : r.sourceUrl ? String(r.sourceUrl) : null, sourceId: r.id != null ? String(r.id) : null, categories: Array.isArray(r.tags) ? r.tags.map(String) : Array.isArray(r.categories) ? r.categories.map(String) : [], language: r.language ? String(r.language) : undefined });
  });
}

/** RFC-4180-ish CSV parser (handles quoted multi-line cells). Columns: title, body|text, date?, url?, tags?, language? */
export function parseCsv(input: string): ExtractedPoem[] {
  const rows = csvRows(input.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const ti = col(["title", "name"]), bi = col(["body", "text", "content", "poem"]), di = col(["date", "published", "publishedat", "written"]), ui = col(["url", "sourceurl", "link"]), gi = col(["tags", "categories", "genre"]), li = col(["language", "lang"]);
  return rows.slice(1).filter((r) => r.some((c) => c.trim())).map((r) => {
    const dateRaw = di >= 0 ? r[di] : ""; const d = dateRaw ? new Date(dateRaw) : null;
    return finish({ title: ti >= 0 ? r[ti] : "", body: bi >= 0 ? r[bi] : "", date: d && !isNaN(d.getTime()) ? d : null, dateText: dateRaw || null, sourceUrl: ui >= 0 ? r[ui] || null : null, categories: gi >= 0 && r[gi] ? r[gi].split(/[;|,]/).map((s) => s.trim()).filter(Boolean) : [], language: li >= 0 && r[li] ? r[li] : undefined });
  });
}
export function csvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Generic HTML: one poem per <article>/<section> with a heading, or a whole page with <h1> + main content. */
export function parseGenericHtml(html: string, url?: string): ExtractedPoem[] {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside, noscript").remove();
  const out: ExtractedPoem[] = [];
  const blocks = $("article, section.poem, .poem, [itemtype*='CreativeWork']");
  const from = (root: cheerio.Cheerio<never>) => {
    const h = root.find("h1, h2, h3").first(); const title = h.text().trim(); h.remove();
    const body = htmlFragmentToText(root.html() ?? "");
    if (title && body) out.push(finish({ title, body, sourceUrl: url ?? null, flags: ["generic-html"], confidence: 0.7 }));
  };
  if (blocks.length) blocks.each((_, el) => from($(el) as never));
  else { const title = $("h1").first().text().trim() || $("title").text().trim(); $("h1").first().remove(); const body = htmlFragmentToText(($("main").html() ?? $("body").html()) ?? ""); if (title && body) out.push(finish({ title, body, sourceUrl: url ?? null, flags: ["generic-html"], confidence: 0.6 })); }
  return out;
}
