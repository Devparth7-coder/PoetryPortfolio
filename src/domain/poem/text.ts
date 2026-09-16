import { createHash } from "node:crypto";

/** Normalise only line endings — never touches the author's words, punctuation or spacing inside lines. */
export function preserveText(input: string): string {
  return input.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").replace(/[ \t]+$/gm, "").replace(/^\n+|\n+$/g, "");
}

/** Exact content hash: title + body exactly as stored (after line-ending normalisation only). */
export function contentHash(title: string, body: string): string {
  return createHash("sha256").update(`${title}\n\u0000\n${body}`).digest("hex");
}

/** Aggressively normalised text for duplicate detection (case, punctuation, whitespace, curly quotes). */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedHash(title: string, body: string): string {
  return createHash("sha256").update(normalizeForMatch(title) + "\n" + normalizeForMatch(body)).digest("hex");
}

export function bodyHash(body: string): string {
  return createHash("sha256").update(normalizeForMatch(body)).digest("hex");
}

export function wordCount(text: string): number {
  const m = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return m ? m.length : 0;
}

export function lineCount(text: string): number {
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}

/** Poetry is read slowly — ~140 wpm, with a floor so very short poems still register. */
export function readingTimeSeconds(words: number): number {
  return Math.max(20, Math.round((words / 140) * 60));
}

export function stats(body: string) {
  const words = wordCount(body);
  return { wordCount: words, characterCount: [...body].length, lineCount: lineCount(body), readingTimeSeconds: readingTimeSeconds(words) };
}

/** Deterministic excerpt: first non-empty lines up to ~160 chars. No AI, no rewriting. */
export function makeExcerpt(body: string, max = 160): string {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  let out = "";
  for (const l of lines) {
    const next = out ? `${out} / ${l}` : l;
    if (next.length > max) break;
    out = next;
  }
  if (!out && lines[0]) out = lines[0].slice(0, max - 1) + "…";
  return out;
}
