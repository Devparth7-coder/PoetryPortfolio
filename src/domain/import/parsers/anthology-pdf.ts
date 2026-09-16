import type { ExtractedPoem } from "@/domain/poem/types";
import { detectLanguage } from "@/domain/poem/language";
import { finalizeText } from "../html-to-text";

/**
 * Parser for the My Poetic Side auto-generated anthology PDF ("Anthology of <author>").
 * Layout facts (verified against the 190-page export):
 *  - every page begins with a running header "Anthology of Dev Parth" and ends with "Page N/190"
 *  - a poem's first page has its title on the line after the header, prefixed with a single space
 *  - continuation pages have no title line
 *  - stanza breaks are rendered as a whitespace-only line
 *  - non-Latin (Devanagari) text is exported as "?" glyphs → unrecoverable; must be flagged, not imported
 */
export interface PdfPage { index: number; text: string }

const HEADER_RE = /^Anthology of .+$/;
const FOOTER_RE = /^Page \d+\/\d+\s*$/;
const FRONT_MATTER = new Set(["dedication", "acknowledgement", "acknowledgements", "about the author", "summary", "preface", "foreword", "contents", "table of contents"]);

export function garbledRatio(text: string): number {
  const visible = text.replace(/\s+/g, "");
  if (!visible) return 0;
  return (visible.match(/\?/g) ?? []).length / visible.length;
}

export function parseAnthologyPages(pages: PdfPage[], sourceLabel = "anthology.pdf"): { poems: ExtractedPoem[]; tableOfContents: string[]; frontMatter: Record<string, string> } {
  const poems: ExtractedPoem[] = [];
  const frontMatter: Record<string, string> = {};
  const toc: string[] = [];
  let current: { title: string; lines: string[]; pageStart: number; pages: number[] } | null = null;
  let mode: "front" | "toc" | "poems" = "front";
  let frontKey: string | null = null;

  const flush = () => {
    if (!current) return;
    const body = finalizeText(current.lines.join("\n"));
    const gr = garbledRatio(body + current.title);
    const flags: string[] = ["no-date-in-source"];
    let confidence = 0.9;
    if (gr > 0.3) { flags.push("non-latin-garbled", "manual-review"); confidence = 0.05; }
    else if (gr > 0.05) { flags.push("possible-encoding-issue", "manual-review"); confidence = 0.5; }
    if (body.split("\n").filter(Boolean).length < 2) { flags.push("very-short-body"); confidence = Math.min(confidence, 0.5); }
    const lang = detectLanguage(body);
    poems.push({
      title: current.title.trim(), body, language: gr > 0.3 ? "und" : lang.language, languageConfidence: gr > 0.3 ? 0 : lang.confidence,
      date: null, dateText: null, sourceUrl: null, sourceId: `${sourceLabel}#p${current.pageStart + 1}`, categories: [], trending: false,
      confidence, flags, metadata: { pdfPages: current.pages.map((p) => p + 1), garbledRatio: Number(gr.toFixed(3)) },
    });
    current = null;
  };

  for (const page of pages) {
    const raw = page.text.replace(/\r/g, "").split("\n");
    const lines = raw.filter((l, i) => !(i === 0 && HEADER_RE.test(l.trim())) && !FOOTER_RE.test(l.trim()));
    if (page.index === 0) continue; // cover
    const first = lines[0] ?? "";
    const titleCandidate = first.startsWith(" ") ? first.trim() : null;

    if (mode !== "poems") {
      const key = titleCandidate?.toLowerCase() ?? first.trim().toLowerCase();
      if (key === "summary" || key === "contents" || key === "table of contents") { mode = "toc"; toc.push(...lines.slice(1).map((l) => l.trim()).filter(Boolean)); continue; }
      if (mode === "toc") {
        // TOC continues until a page that looks like a poem start with a title that appears in the TOC
        const t = titleCandidate;
        const tocHas = t && toc.some((x) => x.replace(/\s+/g, " ").toLowerCase() === t.replace(/\s+/g, " ").toLowerCase());
        const garbledTitle = t && garbledRatio(t) > 0.3;
        if (t && (tocHas || garbledTitle)) { mode = "poems"; }
        else { toc.push(...lines.map((l) => l.trim()).filter(Boolean)); continue; }
      } else if (FRONT_MATTER.has(first.trim().toLowerCase())) { frontKey = first.trim().toLowerCase(); frontMatter[frontKey] = lines.slice(1).join("\n").trim(); continue; }
      else if (mode === "front") { if (frontKey) frontMatter[frontKey] += "\n" + lines.join("\n").trim(); continue; }
    }

    if (titleCandidate !== null && titleCandidate.length > 0) {
      flush();
      current = { title: titleCandidate, lines: lines.slice(1), pageStart: page.index, pages: [page.index] };
    } else if (current) {
      current.lines.push(...lines); current.pages.push(page.index);
    }
  }
  flush();
  return { poems, tableOfContents: toc.filter((l) => !FRONT_MATTER.has(l.toLowerCase())), frontMatter };
}
