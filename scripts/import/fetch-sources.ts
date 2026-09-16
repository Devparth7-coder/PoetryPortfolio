/**
 * Downloads the author's public poem pages + anthology PDF into ./sources/raw (raw provenance snapshots).
 * Polite: identifiable UA, ~0.7s between requests, no retries against anti-bot responses.
 * Usage: npm run import:fetch [-- --only=mps|pc|pdf]
 */
import fs from "node:fs"; import path from "node:path";
import { politeFetch } from "../../src/infrastructure/http/polite-fetch";
import { parseMyPoeticSideListing } from "../../src/domain/import/parsers/my-poetic-side";
import { parsePoetryComListing } from "../../src/domain/import/parsers/poetry-com";

const ROOT = path.resolve(process.cwd(), "sources"); const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const MPS_USER = "51801", PC_USER = "318517";

async function save(file: string, body: string | Buffer) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }

async function main() {
  const manifest: Record<string, unknown> = { fetchedAt: new Date().toISOString() };
  if (!only || only === "mps") {
    const index = new Map<string, ReturnType<typeof parseMyPoeticSideListing>[number]>();
    for (let p = 1; p <= 20; p++) { const r = await politeFetch(`https://mypoeticside.com/all-the-ownpoems-${MPS_USER}-${p}`); if (!r.ok) break; const html = await r.text(); await save(`${ROOT}/mps-list-${p}.html`, html); let added = 0; for (const e of parseMyPoeticSideListing(html)) if (!index.has(e.id)) { index.set(e.id, e); added++; } if (!added) break; }
    fs.writeFileSync(`${ROOT}/mps-index.json`, JSON.stringify([...index.values()], null, 1));
    let ok = 0; const failed: string[] = [];
    for (const e of index.values()) { const f = `${ROOT}/raw/mps/${e.id}.html`; if (fs.existsSync(f) && fs.statSync(f).size > 5000) { ok++; continue; } const r = await politeFetch(e.url); if (r.ok) { await save(f, await r.text()); ok++; } else failed.push(`${e.id}:${r.status}`); }
    manifest.myPoeticSide = { discovered: index.size, saved: ok, failed };
    console.log("My Poetic Side:", manifest.myPoeticSide);
  }
  if (!only || only === "pdf") {
    const r = await politeFetch(`https://mypoeticside.com/pdfs/${MPS_USER}.pdf`);
    if (r.ok) { await save(`${ROOT}/anthology-${MPS_USER}.pdf`, Buffer.from(await r.arrayBuffer())); manifest.anthology = "saved"; } else manifest.anthology = `HTTP ${r.status}`;
    console.log("Anthology:", manifest.anthology);
  }
  if (!only || only === "pc") {
    const index = new Map<string, ReturnType<typeof parsePoetryComListing>[number]>();
    for (let p = 1; p <= 10; p++) { const r = await politeFetch(`https://www.poetry.com/user-poems/${PC_USER}${p > 1 ? `/${p}` : ""}`); if (r.status !== 200) break; const html = await r.text(); await save(`${ROOT}/pc-list-${p}.html`, html); let added = 0; for (const e of parsePoetryComListing(html)) if (!index.has(e.id)) { index.set(e.id, e); added++; } if (!added) break; }
    fs.writeFileSync(`${ROOT}/pc-index.json`, JSON.stringify([...index.values()], null, 1));
    let ok = 0; const blocked: { id: string; title: string; url: string; status: number }[] = [];
    for (const e of index.values()) { const f = `${ROOT}/raw/pc/${e.id}.html`; if (fs.existsSync(f) && fs.statSync(f).size > 5000) { ok++; continue; } const r = await politeFetch(e.url); const txt = await r.text(); if (r.status === 200 && txt.includes("disp-quote-body")) { await save(f, txt); ok++; } else blocked.push({ id: e.id, title: e.title, url: e.url, status: r.status }); }
    manifest.poetryCom = { discovered: index.size, saved: ok, blocked };
    console.log("Poetry.com:", { discovered: index.size, saved: ok, blocked: blocked.length });
  }
  fs.writeFileSync(`${ROOT}/fetch-manifest.json`, JSON.stringify(manifest, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
