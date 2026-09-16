import type { NextRequest } from "next/server";
import { ogImage } from "@/lib/og-image";
import { SITE } from "@/lib/site";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.slice(0, 120) || "Poetry, thoughts, and the things that remained unsaid.";
  const sub = req.nextUrl.searchParams.get("sub")?.slice(0, 80) || (title === SITE.tagline ? undefined : undefined);
  return ogImage({ title, subtitle: sub ?? undefined });
}
