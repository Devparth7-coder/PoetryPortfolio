/** Prints the import manifest (what was imported, merged, and what still requires manual action). */
import fs from "node:fs"; import path from "node:path";
const p = path.join(process.cwd(), "sources/reports/import-manifest.json");
if (!fs.existsSync(p)) { console.error("No manifest yet — run `npm run import:run` first."); process.exit(1); }
const m = JSON.parse(fs.readFileSync(p, "utf8"));
console.log(`Import manifest (${m.generatedAt})\nPoems in archive: ${m.totalPoemsInArchive}\n`);
for (const [k, v] of Object.entries<Record<string, unknown>>(m.sources)) console.log(k.padEnd(14), JSON.stringify(v, (key, val) => (Array.isArray(val) && val.length > 3 ? `[${val.length} items]` : val)));
const need = m.requiresManualAction as { source?: string; status?: string; title?: string; url?: string; reason: string }[]; console.log(`\nRequires manual action: ${need.length}`); for (const n of need) console.log(` - [${n.source ?? n.status}] ${n.title ?? n.url} — ${n.reason}`); console.log(`\nFull manifest: ${p}`);
