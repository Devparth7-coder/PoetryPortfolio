/**
 * Optional AI assistance. Disabled unless AI_PROVIDER is configured.
 * Hard rules: never writes to `works.body`/`title`; all output is labelled AI-generated and requires editorial approval.
 */
import { detectLanguage } from "@/domain/poem/language";
import { makeExcerpt } from "@/domain/poem/text";
import { logger } from "@/infrastructure/logging/logger";

export const aiEnabled = () => (process.env.AI_PROVIDER ?? "none") !== "none" && !!process.env.AI_API_KEY;
export type AiResult<T> = { provider: "none" | "ai"; label: "deterministic" | "AI-generated — requires approval"; data: T };

async function complete(system: string, user: string): Promise<string> {
  const res = await fetch(`${(process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AI_API_KEY}` }, body: JSON.stringify({ model: process.env.AI_MODEL ?? "gpt-4o-mini", temperature: 0.3, messages: [{ role: "system", content: system }, { role: "user", content: user }] }) });
  if (!res.ok) { logger.warn("ai.request.failed", { status: res.status }); throw new Error("AI provider error"); }
  const j = await res.json(); return j.choices?.[0]?.message?.content ?? "";
}

export async function suggestMetadata(poem: { title: string; body: string }): Promise<AiResult<{ tags: string[]; themes: string[]; excerpt: string; language: string }>> {
  const lang = detectLanguage(poem.body);
  if (!aiEnabled()) return { provider: "none", label: "deterministic", data: { tags: [], themes: [], excerpt: makeExcerpt(poem.body), language: lang.language } };
  const out = await complete("You are helping catalogue a poet's own archive. Return strict JSON {\"tags\":[...max 6 single words],\"themes\":[...max 4],\"excerpt\":\"<=160 chars, quote the poem verbatim, do not paraphrase\"}. Never rewrite or correct the poem.", `Title: ${poem.title}\n\n${poem.body}`);
  try { const j = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); return { provider: "ai", label: "AI-generated — requires approval", data: { tags: (j.tags ?? []).slice(0, 6).map(String), themes: (j.themes ?? []).slice(0, 4).map(String), excerpt: poem.body.includes((j.excerpt ?? "").split(" / ")[0]) ? String(j.excerpt) : makeExcerpt(poem.body), language: lang.language } }; }
  catch { return { provider: "none", label: "deterministic", data: { tags: [], themes: [], excerpt: makeExcerpt(poem.body), language: lang.language } }; }
}

export async function explorePoem(poem: { title: string; body: string }): Promise<AiResult<{ themes: string[]; imagery: string[]; structure: string; observations: string[]; disclaimer: string }> | null> {
  if (!aiEnabled()) return null;
  const out = await complete("You are a careful literary reader. Offer possible readings of the poem, never authoritative claims about the author's intent. Return JSON {\"themes\":[],\"imagery\":[],\"structure\":\"\",\"observations\":[]}. Be brief and humble.", `Title: ${poem.title}\n\n${poem.body}`);
  try { const j = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); return { provider: "ai", label: "AI-generated — requires approval", data: { themes: j.themes ?? [], imagery: j.imagery ?? [], structure: j.structure ?? "", observations: j.observations ?? [], disclaimer: "AI-assisted interpretation. These are possible readings, not the author's stated meaning." } }; } catch { return null; }
}

export async function describeArtwork(alt: { title: string; context?: string }): Promise<AiResult<string> | null> {
  if (!aiEnabled()) return null;
  const text = await complete("Write a concise, factual alt text (<=125 chars) for artwork accompanying a poem. Describe what is visible; do not interpret the poem.", `Poem title: ${alt.title}. Context: ${alt.context ?? "none"}`);
  return { provider: "ai", label: "AI-generated — requires approval", data: text.trim().slice(0, 200) };
}
