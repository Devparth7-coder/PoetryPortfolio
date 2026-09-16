const UA = "DevParthArchiveImporter/1.0 (personal archive of the author's own published poems; contact via site)";
let last = 0;
const MIN_GAP_MS = 700;
const ALLOWED_HOSTS = new Set(["mypoeticside.com", "www.mypoeticside.com", "www.poetry.com", "poetry.com"]);

/**
 * Throttled fetch with an honest User-Agent. Only the author's known publishing platforms are allowed,
 * only https, private networks are rejected (SSRF), and no anti-bot evasion is attempted:
 * a non-200 response is reported back to the admin who can then upload the saved HTML instead.
 */
export async function politeFetch(url: string): Promise<Response> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("Only https URLs are allowed");
  if (!ALLOWED_HOSTS.has(u.hostname)) throw new Error(`Host ${u.hostname} is not an allowed import source. Upload the file instead.`);
  const wait = MIN_GAP_MS - (Date.now() - last); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  try { return await fetch(u, { headers: { "user-agent": UA, accept: "text/html,application/pdf" }, redirect: "follow", signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}
