import type { MetadataRoute } from "next";
import { db } from "@/infrastructure/db/client";
import { works, collections } from "@/infrastructure/db/schema";
import { getArchiveTimeline, publicVisible } from "@/application/poems/poem-service";
import { abs } from "@/lib/site";
import { eq } from "drizzle-orm";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [poems, cols, timeline] = await Promise.all([db.select({ slug: works.slug, updatedAt: works.updatedAt }).from(works).where(publicVisible()), db.select({ slug: collections.slug, updatedAt: collections.updatedAt }).from(collections).where(eq(collections.isPublished, true)), getArchiveTimeline()]);
  return [
    { url: abs("/"), changeFrequency: "weekly", priority: 1 }, { url: abs("/poems"), changeFrequency: "weekly", priority: 0.9 }, { url: abs("/archive"), changeFrequency: "monthly", priority: 0.7 }, { url: abs("/collections"), changeFrequency: "monthly", priority: 0.7 }, { url: abs("/about"), changeFrequency: "yearly", priority: 0.6 }, { url: abs("/book"), changeFrequency: "monthly", priority: 0.5 },
    ...poems.map((p) => ({ url: abs(`/poems/${encodeURIComponent(p.slug)}`), lastModified: p.updatedAt, changeFrequency: "yearly" as const, priority: 0.8 })),
    ...cols.map((c) => ({ url: abs(`/collections/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...timeline.years.map((y) => ({ url: abs(`/archive/${y.year}`), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
