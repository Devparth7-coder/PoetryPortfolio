/**
 * Script-based language detection. Deterministic, no network, no LLM.
 * Returns a BCP-47 tag and a confidence; low confidence should be flagged for review.
 */
const SCRIPTS: { tag: string; re: RegExp }[] = [
  { tag: "hi", re: /[\u0900-\u097F]/g },        // Devanagari (Hindi/Marathi/Sanskrit — Hindi assumed for this author)
  { tag: "ur", re: /[\u0600-\u06FF]/g },        // Arabic script (Urdu)
  { tag: "bn", re: /[\u0980-\u09FF]/g },
  { tag: "pa", re: /[\u0A00-\u0A7F]/g },
  { tag: "gu", re: /[\u0A80-\u0AFF]/g },
  { tag: "ta", re: /[\u0B80-\u0BFF]/g },
  { tag: "te", re: /[\u0C00-\u0C7F]/g },
];

const HINGLISH_HINTS = /\b(hai|hain|nahi|nahin|kya|kyun|kyu|tum|tumhe|tera|teri|mera|meri|dil|pyaar|pyar|zindagi|mohabbat|ishq|yaad|raat|khuda|dost|mujhe|tujhe|hum|aur|bhi|kabhi|sapne|aansu|ankhein|aankhon|jaan|tanha|saath)\b/gi;

export type LanguageGuess = { language: string; confidence: number; script: "latin" | "devanagari" | "arabic" | "other" | "mixed" };

export function detectLanguage(text: string): LanguageGuess {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters === 0) return { language: "und", confidence: 0, script: "other" };
  let best: { tag: string; count: number } | null = null;
  for (const s of SCRIPTS) {
    const c = (text.match(s.re) ?? []).length;
    if (c > 0 && (!best || c > best.count)) best = { tag: s.tag, count: c };
  }
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (best && best.count / letters > 0.6) return { language: best.tag, confidence: Math.min(1, best.count / letters), script: best.tag === "hi" ? "devanagari" : best.tag === "ur" ? "arabic" : "other" };
  if (best && best.count / letters > 0.15) return { language: best.tag, confidence: 0.5, script: "mixed" };
  const hinglish = (text.match(HINGLISH_HINTS) ?? []).length;
  const words = (text.match(/\b[A-Za-z]+\b/g) ?? []).length || 1;
  if (hinglish / words > 0.12) return { language: "hi-Latn", confidence: Math.min(0.9, 0.5 + hinglish / words), script: "latin" };
  return { language: "en", confidence: latin / letters, script: "latin" };
}

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English", hi: "Hindi", "hi-Latn": "Hindi (Roman script)", ur: "Urdu", und: "Unknown", bn: "Bengali", pa: "Punjabi",
};
export function languageLabel(tag: string) { return LANGUAGE_LABELS[tag] ?? tag; }
