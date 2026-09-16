import * as cheerio from "cheerio";
import type { ExtractedPoem } from "@/domain/poem/types";
import { htmlFragmentToText } from "../html-to-text";
import { detectLanguage } from "@/domain/poem/language";
import { parseMpsDate } from "./my-poetic-side";

/**
 * Poetry.com poem page parser. Works on HTML supplied by the user (saved page / export) or fetched politely.
 * We do NOT attempt to bypass anti-bot systems; if a fetch is rejected the import UI asks for an HTML upload.
 */
export function parsePoetryComPoemPage(html: string, url?: string): ExtractedPoem | null {
  const $ = cheerio.load(html);
  const title = $("#disp-poem-title").first().text().replace(/\s+/g, " ").trim();
  const bodyEl = $("#disp-quote-body").first();
  if (!title || bodyEl.length === 0) return null;
  // Poetry.com wraps random words in definitions.net links; unwrap them — the text is untouched.
  bodyEl.find("a").each((_, a) => { $(a).replaceWith($(a).text()); });
  const body = htmlFragmentToText(bodyEl.html() ?? "");
  const genres = $(".genres-list a").map((_, a) => $(a).text().trim()).get();
  const meta = $(".poem-meta-copy").text();
  const written = meta.match(/Written on\s+([A-Za-z]+ \d{1,2}, \d{4})/)?.[1] ?? null;
  const submitted = meta.match(/Submitted by .*? on\s+([A-Za-z]+ \d{1,2}, \d{4})/)?.[1] ?? null;
  const idMatch = (url ?? "").match(/\/poem\/(\d+)/) ?? html.match(/\/poem\/(\d+)\//);
  const canonical = $('link[rel="canonical"]').attr("href");
  const lang = detectLanguage(body);
  const flags: string[] = [];
  if (lang.confidence < 0.6) flags.push("language-uncertain");
  if (!written && !submitted) flags.push("missing-date");
  const dateText = written ?? submitted;
  return {
    title, body,
    language: lang.language, languageConfidence: lang.confidence,
    date: parseMpsDate(dateText), dateText,
    sourceUrl: url ?? canonical ?? (idMatch ? `https://www.poetry.com/poem/${idMatch[1]}` : null),
    sourceId: idMatch?.[1] ?? null,
    categories: genres,
    trending: false,
    confidence: body.length < 20 ? 0.4 : 0.97,
    flags,
    metadata: { writtenOn: written ?? undefined, submittedOn: submitted ?? undefined },
  };
}

export function parsePoetryComListing(html: string): { id: string; slug: string; title: string; url: string; addedText: string | null }[] {
  const $ = cheerio.load(html); const out: { id: string; slug: string; title: string; url: string; addedText: string | null }[] = [];
  const seen = new Set<string>();
  const scope = $(".submitted-poems-list").length ? $(".submitted-poems-list") : $("body");
  scope.find('a[href^="/poem/"]').each((_, a) => {
    const href = $(a).attr("href") ?? ""; const m = href.match(/^\/poem\/(\d+)\/([^/?#]+)/); const t = $(a).text().trim();
    if (!m || !t || seen.has(m[1])) return; seen.add(m[1]);
    const row = $(a).closest("tr, li, .poem-item"); const added = row.text().match(/added\s+([^\n]+?)\s*(?:\d|\*|$)/)?.[1]?.trim() ?? null;
    out.push({ id: m[1], slug: m[2], title: t, url: `https://www.poetry.com/poem/${m[1]}/${m[2]}`, addedText: added });
  });
  return out;
}
