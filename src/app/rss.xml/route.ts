import { buildRss } from "@/lib/rss"; export const revalidate = 1800; export async function GET() { return buildRss({ title: "Dev Parth — Poetry", path: "/rss.xml" }); }
