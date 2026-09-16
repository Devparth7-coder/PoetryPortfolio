import { handler, ok } from "@/lib/api";
import { getSessionUser } from "@/infrastructure/auth/session";
export const dynamic = "force-dynamic";
export const GET = handler(async () => { const u = await getSessionUser(); return ok({ user: u ? { name: u.name, role: u.role } : null }, { cache: "private, no-store" }); });
