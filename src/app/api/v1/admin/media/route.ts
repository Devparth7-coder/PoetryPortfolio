import { fail, ok } from "@/lib/api";
import { adminHandler } from "@/lib/admin-api";
import { listMedia, MediaError, uploadImage } from "@/application/media/media-service";
export const dynamic = "force-dynamic";
export const GET = adminHandler(async () => ok(await listMedia()));
export const POST = adminHandler(async (req, _c, user) => {
  const form = await req.formData(); const file = form.get("file"); if (!(file instanceof File)) return fail(400, "no_file", "Attach an image");
  const alt = form.get("altText"); try { return ok(await uploadImage({ name: file.name, type: file.type, buffer: Buffer.from(await file.arrayBuffer()) }, typeof alt === "string" ? alt : null, user), { status: 201 }); }
  catch (e) { if (e instanceof MediaError) return fail(400, "invalid_media", e.message); throw e; }
});
