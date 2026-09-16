import { z } from "zod";
import { assertSameOrigin, requireAdmin, type SessionUser } from "@/infrastructure/auth/session";
import { handler } from "./api";
/** Admin route wrapper: server-side session check + role + same-origin for mutations. */
export function adminHandler<Ctx>(fn: (req: Request, ctx: Ctx, user: SessionUser) => Promise<Response>, opts: { role?: "VIEWER" | "EDITOR" | "OWNER" } = {}) {
  return handler<Ctx>(async (req, ctx) => { if (req.method !== "GET") assertSameOrigin(req); const user = await requireAdmin(opts.role ?? (req.method === "GET" ? "VIEWER" : "EDITOR")); return fn(req, ctx, user); }, { limit: { n: 300, windowMs: 60_000, key: "admin" } });
}
const nullableDate = z.union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.null()]).optional().transform((v) => (v === undefined ? undefined : v === null ? null : new Date(v)));
export const PoemInputSchema = z.object({
  title: z.string().min(1).max(300), body: z.string().min(1).max(60_000), language: z.string().min(2).max(12).optional(), status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(), featured: z.boolean().optional(),
  excerpt: z.string().max(400).nullable().optional(), writtenAt: nullableDate, publishedAt: nullableDate, publishAt: nullableDate, unpublishAt: nullableDate, seoTitle: z.string().max(120).nullable().optional(), seoDescription: z.string().max(300).nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(50).optional(), collectionIds: z.array(z.string().uuid()).max(50).optional(), coverMediaId: z.string().uuid().nullable().optional(), slug: z.string().max(200).optional(), metadata: z.record(z.string(), z.unknown()).optional(), changeNote: z.string().max(300).optional(),
});
export const CollectionInputSchema = z.object({ title: z.string().min(1).max(200), description: z.string().max(1000).nullable().optional(), slug: z.string().max(120).optional(), coverMediaId: z.string().uuid().nullable().optional(), featuredWorkId: z.string().uuid().nullable().optional(), sortOrder: z.number().int().optional(), isPublished: z.boolean().optional(), poemIds: z.array(z.string().uuid()).max(1000).optional() });
