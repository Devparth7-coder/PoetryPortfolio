import { NextResponse, type NextRequest } from "next/server";
/**
 * Edge gate: redirects unauthenticated /admin requests (no session cookie) to /admin/login.
 * The real authorization check happens server-side in the admin layout and every admin API route —
 * this is only a fast path, never the sole protection.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.get("dp_admin_session")?.value) {
    const url = req.nextUrl.clone(); url.pathname = "/admin/login"; url.searchParams.set("next", pathname); return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/admin/:path*"] };
