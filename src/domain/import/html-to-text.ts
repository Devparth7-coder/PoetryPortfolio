import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

/**
 * Convert a poem's HTML fragment to plain text while preserving the author's line structure:
 *  - <br>            → "\n"
 *  - <p>/<div>       → paragraph boundary ("\n\n") — stanza breaks
 *  - inline elements → transparent (span, a, em, strong, font…)
 *  - scripts/styles/buttons/nav → removed
 * We never re-wrap, re-punctuate, or trim inside a line (only trailing whitespace on each line).
 */
const BLOCK = new Set(["p", "div", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "li", "ul", "ol", "pre", "section", "article", "header", "footer", "table", "tr"]);
const SKIP = new Set(["script", "style", "button", "noscript", "svg", "iframe", "form", "input", "select", "textarea", "nav", "aside"]);

export function htmlFragmentToText(html: string): string {
  const $ = cheerio.load(`<root>${html}</root>`, { decodeEntities: true } as never);
  let out = "";
  const walk = (node: AnyNode) => {
    if (node.type === "text") { out += (node as unknown as { data: string }).data.replace(/[\r\n\t]+/g, " "); return; }
    if (node.type !== "tag" && node.type !== "root") return;
    const el = node as unknown as { name: string; children: AnyNode[]; attribs?: Record<string, string> };
    const name = (el.name ?? "").toLowerCase();
    if (SKIP.has(name)) return;
    if (name === "br") { out += "\n"; return; }
    const isBlock = BLOCK.has(name);
    if (isBlock && out && !out.endsWith("\n\n")) out += out.endsWith("\n") ? "\n" : "\n\n";
    for (const c of el.children ?? []) walk(c);
    if (isBlock && !out.endsWith("\n\n")) out += out.endsWith("\n") ? "\n" : "\n\n";
  };
  const root = $("root")[0];
  for (const c of root.children) walk(c as AnyNode);
  return finalizeText(out);
}

export function finalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, "").replace(/^ +(?=\S)/, (m) => (m.length > 3 ? m : ""))) // keep deliberate deep indents, drop stray single spaces from markup
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}
