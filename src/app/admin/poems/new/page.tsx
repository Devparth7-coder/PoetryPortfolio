import { PoemEditor } from "@/components/admin/poem-editor";
import { listCollectionsForAdmin, listTags } from "@/application/poems/poem-service";
export default async function NewPoem() { const [tags, cols] = await Promise.all([listTags(), listCollectionsForAdmin()]); return <PoemEditor poem={null} tags={tags} collections={cols} />; }
