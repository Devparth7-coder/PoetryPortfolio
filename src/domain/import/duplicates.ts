import { normalizedHash, contentHash, bodyHash } from "@/domain/poem/text";
import { textSimilarity, titleSimilarity } from "@/domain/poem/similarity";

export interface ExistingWorkLite { id: string; title: string; body: string; contentHash: string; normalizedHash: string }
export type MatchKind = "exact" | "normalized" | "body" | "title+text" | "title-only" | "none";
export interface DuplicateMatch { workId: string | null; kind: MatchKind; similarity: number; titleSimilarity: number; status: "NEW" | "DUPLICATE_EXACT" | "DUPLICATE_LIKELY" | "CONFLICT" }

/**
 * Deterministic duplicate detection, in order of certainty:
 *  1. exact content hash (title+body identical)
 *  2. normalised hash (case/punctuation/whitespace-insensitive)
 *  3. identical normalised body with different title
 *  4. same/similar title + high text similarity → CONFLICT (versions differ; admin must choose)
 *  5. same title, different text → CONFLICT
 */
export function findDuplicate(candidate: { title: string; body: string }, existing: ExistingWorkLite[]): DuplicateMatch {
  const ch = contentHash(candidate.title, candidate.body);
  const nh = normalizedHash(candidate.title, candidate.body);
  const bh = bodyHash(candidate.body);
  for (const w of existing) if (w.contentHash === ch) return { workId: w.id, kind: "exact", similarity: 1, titleSimilarity: 1, status: "DUPLICATE_EXACT" };
  for (const w of existing) if (w.normalizedHash === nh) return { workId: w.id, kind: "normalized", similarity: 1, titleSimilarity: 1, status: "DUPLICATE_EXACT" };
  for (const w of existing) if (bodyHash(w.body) === bh) return { workId: w.id, kind: "body", similarity: 1, titleSimilarity: titleSimilarity(candidate.title, w.title), status: "DUPLICATE_LIKELY" };
  let best: DuplicateMatch = { workId: null, kind: "none", similarity: 0, titleSimilarity: 0, status: "NEW" };
  for (const w of existing) {
    const ts = titleSimilarity(candidate.title, w.title);
    if (ts < 0.8) continue;
    const sim = textSimilarity(candidate.body, w.body);
    const score = sim * 0.8 + ts * 0.2;
    if (score > best.similarity) best = { workId: w.id, kind: sim >= 0.9 ? "title+text" : "title-only", similarity: sim, titleSimilarity: ts, status: sim >= 0.97 ? "DUPLICATE_LIKELY" : "CONFLICT" };
  }
  return best;
}
