export type WorkStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
export type SourceKind = "MY_POETIC_SIDE" | "POETRY_COM" | "ANTHOLOGY" | "MANUAL" | "PDF" | "MARKDOWN" | "TXT" | "CSV" | "JSON" | "HTML";

export const SOURCE_LABELS: Record<SourceKind, string> = {
  MY_POETIC_SIDE: "My Poetic Side",
  POETRY_COM: "Poetry.com",
  ANTHOLOGY: "Anthology (PDF)",
  MANUAL: "Manual entry",
  PDF: "PDF",
  MARKDOWN: "Markdown",
  TXT: "Plain text",
  CSV: "CSV",
  JSON: "JSON",
  HTML: "HTML",
};

export const AUTHOR_PROFILES = {
  MY_POETIC_SIDE: "https://mypoeticside.com/user-51801",
  POETRY_COM: "https://www.poetry.com/user/318517/devparth9784",
} as const;

/** Poem extracted from any source before it is persisted. */
export interface ExtractedPoem {
  title: string;
  body: string;
  language?: string;
  languageConfidence?: number;
  date?: Date | null;
  dateText?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  categories?: string[];
  trending?: boolean;
  confidence: number;      // 0..1 extraction confidence
  flags: string[];         // e.g. "low-confidence", "non-latin-garbled", "no-title"
  metadata?: Record<string, unknown>;
}
