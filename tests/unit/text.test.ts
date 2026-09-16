import { describe, it, expect } from "vitest";
import { preserveText, contentHash, normalizedHash, normalizeForMatch, wordCount, lineCount, readingTimeSeconds, makeExcerpt } from "@/domain/poem/text";
describe("text preservation", () => {
  it("keeps line breaks, blank stanza breaks and punctuation exactly", () => {
    const src = "Line one,\n  indented line — with dash…\n\nStanza two!";
    expect(preserveText(src)).toBe(src);
  });
  it("normalises CRLF but nothing else", () => { expect(preserveText("a\r\nb")).toBe("a\nb"); });
  it("contentHash changes on any punctuation change; normalizedHash does not", () => {
    const a = contentHash("T", "Hello, world"); const b = contentHash("T", "Hello world");
    expect(a).not.toBe(b); expect(normalizedHash("T", "Hello, world")).toBe(normalizedHash("t", "hello   WORLD"));
  });
  it("normalizeForMatch collapses whitespace & case only", () => { expect(normalizeForMatch("A  b\nC")).toBe(normalizeForMatch("a b c")); });
  it("stats", () => { expect(wordCount("one two  three")).toBe(3); expect(lineCount("a\n\nb\nc")).toBe(3); expect(readingTimeSeconds(1)).toBe(20); expect(readingTimeSeconds(280)).toBe(120); });
  it("excerpt is deterministic and joins lines with slash", () => { const e = makeExcerpt("first line\nsecond line\n\nthird"); expect(e).toBe("first line / second line / third"); expect(makeExcerpt("x".repeat(500)).length).toBeLessThanOrEqual(161); });
});
