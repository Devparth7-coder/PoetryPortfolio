import { ImageResponse } from "next/og";
import fs from "node:fs"; import path from "node:path";

let fontCache: { display: ArrayBuffer; body: ArrayBuffer } | null = null;
function fonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "src/fonts");
  const toAb = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  fontCache = { display: toAb(fs.readFileSync(path.join(dir, "fraunces-400.ttf"))), body: toAb(fs.readFileSync(path.join(dir, "newsreader-italic-400.ttf"))) };
  return fontCache;
}

/** Minimal typographic share card: title, author, subtle warm background. No stock imagery. */
export function ogImage({ title, subtitle, lines }: { title: string; subtitle?: string; lines?: string[] }) {
  const size = title.length > 60 ? 54 : title.length > 36 ? 68 : 84;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 84px", background: "linear-gradient(160deg, #f6f1e8 0%, #efe6d6 100%)", color: "#1d1a17", fontFamily: "Newsreader" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: "#857c73", fontFamily: "Fraunces" }}><span>Dev Parth</span><span>Poetry archive</span></div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: size, lineHeight: 1.08, letterSpacing: -1.5, fontFamily: "Fraunces", fontWeight: 400, maxWidth: 1000 }}>{title}</div>
          {lines && lines.length > 0 && <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.45, color: "#4a4440", display: "flex", flexDirection: "column" }}>{lines.slice(0, 3).map((l, i) => <span key={i}>{l}</span>)}</div>}
          {subtitle && <div style={{ marginTop: 26, fontSize: 28, color: "#8a5a3c" }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 24, color: "#4a4440" }}><div style={{ width: 48, height: 1, background: "#8a5a3c" }} />a poem by Dev Parth</div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Fraunces", data: fonts().display, style: "normal", weight: 400 }, { name: "Newsreader", data: fonts().body, style: "italic", weight: 400 }], headers: { "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" } },
  );
}
