import { NextResponse, type NextRequest } from "next/server";
import { getRandomPoem } from "@/application/poems/poem-service";
export const dynamic = "force-dynamic";
/** "Read something unexpected": excludes recently read (client sends slugs via cookie-free query) and biases toward preferred tags. */
export async function GET(req: NextRequest) {
  const exclude = (req.nextUrl.searchParams.get("exclude") ?? "").split(",").filter(Boolean).slice(0, 100);
  const tags = (req.nextUrl.searchParams.get("tags") ?? "").split(",").filter(Boolean).slice(0, 10);
  const p = await getRandomPoem(exclude, tags);
  if (!p) return NextResponse.redirect(new URL("/poems", req.url));
  return NextResponse.redirect(new URL(`/poems/${encodeURIComponent(p.slug)}`, req.url), { status: 307 });
}
