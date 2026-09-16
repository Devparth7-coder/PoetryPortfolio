import { handler, ok } from "@/lib/api";
import { assertSameOrigin, destroySession } from "@/infrastructure/auth/session";
export const dynamic = "force-dynamic";
export const POST = handler(async (req) => { assertSameOrigin(req); await destroySession(); return ok({ loggedOut: true }); });
