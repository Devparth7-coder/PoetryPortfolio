import type { NextRequest } from "next/server";
import { ogImage } from "@/lib/og-image";
import { getPublishedPoemBySlug } from "@/application/poems/poem-service";
import { formatDate } from "@/lib/format";
export const runtime = "nodejs";
export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const p = await getPublishedPoemBySlug(decodeURIComponent(slug));
  if (!p) return new Response("Not found", { status: 404 });
  const lines = p.language.startsWith("hi") ? [] : p.body.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 3);
  const d = p.writtenAt ?? p.publishedAt;
  return ogImage({ title: p.title, lines, subtitle: d ? formatDate(d, { day: false }) ?? undefined : undefined });
}
