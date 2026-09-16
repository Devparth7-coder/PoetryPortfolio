import type { NextRequest } from "next/server";
import { getPublishedPoemBySlug } from "@/application/poems/poem-service";
import { formatDate } from "@/lib/format";
import { renderPoemPdf } from "@/infrastructure/pdf/render";
export const runtime = "nodejs";
/** Clean, typeset PDF of a single poem (Times-based core fonts; Devanagari falls back to the print stylesheet). */
export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const p = await getPublishedPoemBySlug(decodeURIComponent(slug));
  if (!p) return new Response("Not found", { status: 404 });
  if (!/^[\x00-\u024F\u2000-\u206F\u20B9]*$/.test(p.title + p.body)) return new Response("PDF export is available for Latin-script poems; use Print for this one.", { status: 415 });
  const d = p.writtenAt ?? p.publishedAt;
  const pdf = renderPoemPdf({ title: p.title, body: p.body, author: "Dev Parth", date: d ? formatDate(d) ?? "" : "", footer: `devparth — poetry archive · ${p.slug}` });
  return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${p.slug}.pdf"`, "cache-control": "public, max-age=86400" } });
}
