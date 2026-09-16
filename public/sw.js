/* Offline reading for cached poems. Never caches /admin or /api/v1/admin. */
const VERSION = "dp-v1"; const OFFLINE = "/offline";
const PRIVATE = /^\/(admin|api\/v1\/admin|api\/v1\/session|api\/v1\/auth)/;
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE, "/icon.svg"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return; const url = new URL(req.url); if (url.origin !== location.origin || PRIVATE.test(url.pathname)) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || /\.(woff2|svg|png|ico)$/.test(url.pathname)) { e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; }))); return; }
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(fetch(req).then((res) => { if (res.ok && (url.pathname.startsWith("/poems/") || url.pathname === "/" || url.pathname === "/library")) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE))));
  }
});
