import { describe, it, expect } from "vitest";
import { detectLanguage } from "@/domain/poem/language";
import { slugify, uniqueSlug } from "@/domain/poem/slug";
import { textSimilarity, titleSimilarity, diffLines } from "@/domain/poem/similarity";
describe("language", () => {
  it("detects Devanagari as Hindi", () => { const g = detectLanguage("मैं चुप हूँ, मगर बोलता हूँ"); expect(g.language).toBe("hi"); expect(g.script).toBe("devanagari"); });
  it("detects English", () => { expect(detectLanguage("The day I left, no one noticed the door.").language).toBe("en"); });
  it("flags romanised Hindi/Urdu with lower confidence", () => { const g = detectLanguage("dil ki baat hai yaar, tum samjho na samjho, main kya karoon"); expect(["hi-Latn", "en"]).toContain(g.language); expect(g.confidence).toBeLessThan(1); });
});
describe("slug", () => {
  it("slugifies unicode & punctuation", () => { expect(slugify("The Day I Left!")).toBe("the-day-i-left"); expect(slugify("  Café — déjà vu ")).toBe("cafe-deja-vu"); });
  it("transliterates or hashes Devanagari titles into a non-empty slug", () => { expect(slugify("ख़ामोशी").length).toBeGreaterThan(0); });
  it("uniqueSlug appends suffix", () => { expect(uniqueSlug("a", new Set(["a"]))).toBe("a-2"); expect(uniqueSlug("a", new Set(["a", "a-2"]))).toBe("a-3"); });
});
describe("similarity", () => {
  it("identical → 1, unrelated → low", () => { expect(textSimilarity("a b c d e", "a b c d e")).toBe(1); expect(textSimilarity("roses are red", "quantum chromodynamics lattice")).toBeLessThan(0.2); });
  it("small edits stay highly similar", () => { const a = "No one noticed the exact moment I became someone who was leaving"; expect(textSimilarity(a, a.replace("exact", "precise"))).toBeGreaterThan(0.8); expect(titleSimilarity("The Day I Left", "the day i left.")).toBeGreaterThan(0.95); });
  it("diffLines marks add/del", () => { const d = diffLines("a\nb\nc", "a\nx\nc"); expect(d.filter((l) => l.type === "del").map((l) => l.text)).toEqual(["b"]); expect(d.filter((l) => l.type === "add").map((l) => l.text)).toEqual(["x"]); });
});
