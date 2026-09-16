import { normalizeForMatch } from "./text";

/** Dice coefficient on word bigrams — cheap, robust for near-duplicate poems. */
export function textSimilarity(a: string, b: string): number {
  const A = bigrams(normalizeForMatch(a)); const B = bigrams(normalizeForMatch(b));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) ?? 0);
  const total = [...A.values()].reduce((s, v) => s + v, 0) + [...B.values()].reduce((s, v) => s + v, 0);
  return (2 * inter) / total;
}
function bigrams(s: string) {
  const w = s.split(" ").filter(Boolean); const m = new Map<string, number>();
  if (w.length === 1) m.set(w[0], 1);
  for (let i = 0; i < w.length - 1; i++) { const k = w[i] + " " + w[i + 1]; m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
}

export function titleSimilarity(a: string, b: string): number {
  const x = normalizeForMatch(a), y = normalizeForMatch(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  return levenshteinRatio(x, y);
}
function levenshteinRatio(a: string, b: string) {
  const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

/** Line-level diff (LCS) for version comparison UI. */
export type DiffLine = { type: "same" | "add" | "del"; text: string };
export function diffLines(a: string, b: string): DiffLine[] {
  const A = a.split("\n"), B = b.split("\n");
  const dp: number[][] = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--)
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = []; let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { out.push({ type: "same", text: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "del", text: A[i] }); i++; }
    else { out.push({ type: "add", text: B[j] }); j++; }
  }
  while (i < A.length) out.push({ type: "del", text: A[i++] });
  while (j < B.length) out.push({ type: "add", text: B[j++] });
  return out;
}
