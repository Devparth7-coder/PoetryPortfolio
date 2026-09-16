import { describe, it, expect } from "vitest";
import fs from "node:fs"; import path from "node:path";
import { parseMyPoeticSidePoemPage, parseMpsDate } from "@/domain/import/parsers/my-poetic-side";
import { parsePoetryComPoemPage } from "@/domain/import/parsers/poetry-com";
import { parseTextOrMarkdown, parseCsv, parseJson } from "@/domain/import/parsers/generic";
const fx = (n: string) => fs.readFileSync(path.join(__dirname, "../fixtures", n), "utf8");
describe("My Poetic Side parser", () => {
  const p = parseMyPoeticSidePoemPage(fx("mps-poem.html"), "https://mypoeticside.com/show-poem-164348")!;
  it("extracts title, body, date and source id", () => { expect(p).toBeTruthy(); expect(p.title.length).toBeGreaterThan(0); expect(p.body.split("\n").length).toBeGreaterThan(2); expect(p.date).toBeInstanceOf(Date); expect(p.sourceId).toBe("164348"); });
  it("does not include like-box / script text", () => { expect(p.body).not.toMatch(/function|<script|Like this poem/i); });
  it("parses MPS dates", () => { expect(parseMpsDate("July 24th, 2026 23:25")?.toISOString()).toBe("2026-07-24T23:25:00.000Z"); expect(parseMpsDate("garbage")).toBeNull(); });
});
describe("Poetry.com parser", () => {
  it("extracts title, body, genres", () => { const p = parsePoetryComPoemPage(fx("pc-poem.html"), "https://www.poetry.com/poem/x")!; expect(p).toBeTruthy(); expect(p.title.length).toBeGreaterThan(0); expect(p.body.length).toBeGreaterThan(20); expect(Array.isArray(p.categories)).toBe(true); });
});
describe("generic parsers", () => {
  it("splits pasted text on --- and keeps inner blank lines", () => { const ps = parseTextOrMarkdown("Title A\n\nline 1\n\nline 3\n\n---\n\nTitle B\n\nx"); expect(ps.map((p) => p.title)).toEqual(["Title A", "Title B"]); expect(ps[0].body).toBe("line 1\n\nline 3"); });
  it("parses csv with quoted multi-line bodies", () => { const ps = parseCsv('title,body,date\n"A","l1\nl2",2024-01-02\n'); expect(ps).toHaveLength(1); expect(ps[0].body).toBe("l1\nl2"); expect(ps[0].date?.getUTCFullYear()).toBe(2024); });
  it("parses json array and object-with-poems", () => { expect(parseJson('[{"title":"A","body":"b"}]')).toHaveLength(1); expect(parseJson('{"poems":[{"title":"A","body":"b"},{"title":"B","body":"c"}]}')).toHaveLength(2); });
});
