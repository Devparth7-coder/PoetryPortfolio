import { listMedia } from "@/application/media/media-service";
import { PageTitle } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";
export default async function AdminMedia() { const items = await listMedia(); return (<><PageTitle eyebrow="Assets" title="Media library" /><MediaLibrary items={JSON.parse(JSON.stringify(items))} /></>); }
