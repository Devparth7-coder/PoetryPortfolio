import { notFound } from "next/navigation";
import { PoemEditor } from "@/components/admin/poem-editor";
import { getAdminPoem, listCollectionsForAdmin, listTags } from "@/application/poems/poem-service";
export default async function EditPoem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [poem, tags, cols] = await Promise.all([getAdminPoem(id), listTags(), listCollectionsForAdmin()]); if (!poem) notFound();
  return <PoemEditor poem={JSON.parse(JSON.stringify(poem))} tags={tags} collections={cols} />;
}
