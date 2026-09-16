import * as cheerio from "cheerio";
import type { ExtractedPoem } from "@/domain/poem/types";
import { htmlFragmentToText } from "../html-to-text";
import { detectLanguage } from "@/domain/poem/language";

const MONTHS: Record<string, number> = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11, jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** "July 24th, 2026 23:25" or "Jul 24th 2026 (23:25)" → Date (UTC, as displayed by source). Returns null if unparseable — never guesses. */
export function parseMpsDate(text: string | null | undefined): Date | null {
  if (!text) return null;
  const m = text.trim().match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:\s*\(?(\d{1,2}):(\d{2})\)?)?/);
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()]; if (mon === undefined) return null;
  const d = new Date(Date.UTC(+m[3], mon, +m[2], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0));
  return isNaN(d.getTime()) ? null : d;
}

export function parseMyPoeticSidePoemPage(html: string, url?: string): ExtractedPoem | null {
  const $ = cheerio.load(html);
  const title = $("h1.title-poem").first().text().replace(/\s+/g, " ").trim();
  const entry = $("#contentfont, .poem-entry").first();
  if (!title || entry.length === 0) return null;
  entry.find("script, style, .likebox, button, .favorite-toggle, #nav-post, .sharedaddy").remove();
  const body = htmlFragmentToText(entry.html() ?? "");
  const flags: string[] = [];
  const dataText = $(".datospoema").text();
  const items: Record<string, string> = {};
  $(".datospoema li").each((_, li) => {
    const label = $(li).find("strong").first().text().replace(/\s+/g, " ").replace(/:\s*$/, "").trim().toLowerCase();
    const value = $(li).clone().children("strong").remove().end().text().replace(/\s+/g, " ").trim();
    if (label) items[label] = value;
  });
  const pub = items["published"] ?? null;
  const category = items["category"];
  const authorNote = items["comment from author about the poem"] ?? null;
  const idMatch = (url ?? "").match(/show-poem-(\d+)/) ?? html.match(/show-poem-(\d+)/);
  const lang = detectLanguage(body);
  if (lang.confidence < 0.6) flags.push("language-uncertain");
  if (body.length < 20) flags.push("very-short-body");
  if (!pub) flags.push("missing-date");
  return {
    title, body,
    language: lang.language, languageConfidence: lang.confidence,
    date: parseMpsDate(pub), dateText: pub,
    sourceUrl: url ?? (idMatch ? `https://mypoeticside.com/show-poem-${idMatch[1]}` : null),
    sourceId: idMatch?.[1] ?? null,
    categories: category && category !== "Unclassified" ? [category] : [],
    trending: false,
    confidence: body.length < 20 ? 0.4 : 0.98,
    flags,
    metadata: { views: Number(dataText.match(/Views:\s*(\d+)/)?.[1] ?? 0) || undefined, authorNote: authorNote ?? undefined },
  };
}

/** Parse the "all-the-ownpoems" listing pages for id, title, trending flag and date. */
export function parseMyPoeticSideListing(html: string): { id: string; title: string; trending: boolean; dateText: string | null; url: string }[] {
  const $ = cheerio.load(html);
  const out: { id: string; title: string; trending: boolean; dateText: string | null; url: string }[] = [];
  $("ul.list-poems li, li").each((_, li) => {
    const a = $(li).find('a[href*="show-poem-"]').first();
    const href = a.attr("href") ?? ""; const id = href.match(/show-poem-(\d+)/)?.[1];
    if (!id) return;
    const trending = $(li).find('[title*="trended" i]').length > 0 || $(li).text().includes("🔥");
    const dateText = $(li).find('span[style*="999"]').first().text().trim() || null;
    out.push({ id, title: a.text().trim(), trending, dateText, url: `https://mypoeticside.com/show-poem-${id}` });
  });
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
