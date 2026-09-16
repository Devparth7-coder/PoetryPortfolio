import type { PdfPage } from "@/domain/import/parsers/anthology-pdf";
import { createRequire } from "node:module";

/** Extract per-page text from a PDF, inserting a newline whenever the baseline (y) changes — preserves the poem's line structure. */
export async function extractPdfPages(buf: Buffer): Promise<PdfPage[]> {
  const require = createRequire(import.meta.url);
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (b: Buffer, o: Record<string, unknown>) => Promise<unknown>;
  const pages: PdfPage[] = [];
  await pdfParse(buf, {
    pagerender: async (pageData: { getTextContent: (o: Record<string, boolean>) => Promise<{ items: { str: string; transform: number[] }[] }> }) => {
      const tc = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      let last: number | null = null; let text = "";
      for (const it of tc.items) { const y = it.transform[5]; if (last !== null && Math.abs(y - last) > 2) text += "\n"; text += it.str; last = y; }
      pages.push({ index: pages.length, text }); return text;
    },
  });
  return pages;
}
